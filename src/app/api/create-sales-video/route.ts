import { NextRequest, NextResponse } from "next/server";
import { runCreateSalesVideo } from "@/lib/sales-video-pipeline";
import type {
  AnalysisResult,
  ProductInput,
  VideoPlan,
} from "@/lib/video-pipeline";
import type { ProductAnalysis } from "@/lib/product-analysis";
import {
  VIDEO_ENGINE_PREPARING_MESSAGE,
  VIDEO_LIMIT_ERROR,
  VIDEO_RATE_LIMIT_ERROR,
} from "@/lib/billing/plans";
import { requireAuthUser } from "@/lib/auth/session";
import {
  checkVideoLimit,
  consumeVideoUsage,
  recordVideoGenerationAttempt,
} from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 300;

function emptyFailureBody(error: string, elapsedMs: number) {
  return {
    success: false as const,
    error,
    product_id: "",
    scenario_id: "",
    video_id: "",
    video_url: "",
    audio_url: "",
    score: 0,
    selling_angle: "",
    hook: "",
    steps: {
      analysis: false,
      scenario: false,
      kling: false,
      narration: false,
      captions: false,
      evaluation: false,
      saved: false,
    },
    watermark_applied: false,
    elapsed_ms: elapsedMs,
  };
}

function asOptionalObject<T>(value: unknown): T | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as T;
}

/**
 * POST /api/create-sales-video
 *
 * 生成前: 月間上限 + 連続生成ガード（API強制）
 * 成功かつ generated_videos 保存後のみ usage カウント
 *
 * 追加ペイロード（任意・後方互換）:
 * - productData: ProductInput
 * - analysisResult: AnalysisResult
 * - videoPlan: VideoPlan
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です", login_url: "/login" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const image = String(body.image ?? body.image_base64 ?? "");
    const userId = user.id;

    const limit = await checkVideoLimit(userId, { email: user.email });
    if (!limit.allowed) {
      const message =
        limit.code === "rate"
          ? VIDEO_RATE_LIMIT_ERROR
          : limit.code === "free"
            ? limit.reason ?? VIDEO_LIMIT_ERROR
            : limit.reason ?? VIDEO_LIMIT_ERROR;
      return NextResponse.json(
        {
          error: message,
          plan: limit.plan,
          remaining: limit.remaining,
          upgrade_url: "/pricing",
        },
        { status: 403 }
      );
    }

    // 動画生成エンジン未接続時はパイプラインを実行しない（接続後: VIDEO_ENGINE_ENABLED=1）
    if (process.env.VIDEO_ENGINE_ENABLED !== "1") {
      return NextResponse.json({
        ...emptyFailureBody(
          VIDEO_ENGINE_PREPARING_MESSAGE,
          Date.now() - startedAt
        ),
        engine_preparing: true,
        plan: limit.plan,
        remaining: limit.remaining,
        message: VIDEO_ENGINE_PREPARING_MESSAGE,
      });
    }

    // 許可後に試行を記録（並列連打対策）
    recordVideoGenerationAttempt(userId);

    const watermarkRequired = limit.plan === "free";

    const productData = asOptionalObject<ProductInput>(body.productData);
    const analysisResult = asOptionalObject<AnalysisResult>(
      body.analysisResult
    );
    const videoPlan = asOptionalObject<VideoPlan>(body.videoPlan);
    const productAnalysis = asOptionalObject<ProductAnalysis>(
      body.productAnalysis
    );

    // productData / analysisResult / videoPlan がある場合は欠落フィールドを補完
    const productName =
      String(body.product_name ?? "").trim() ||
      productData?.name?.trim() ||
      "";
    const description =
      String(body.description ?? "").trim() ||
      productData?.description?.trim() ||
      "";
    const target =
      String(body.target ?? "").trim() ||
      productData?.target?.trim() ||
      analysisResult?.targetAudience?.trim() ||
      "";
    const hook =
      (typeof body.hook === "string" && body.hook.trim()) ||
      analysisResult?.hook?.trim() ||
      undefined;
    const cta =
      (typeof body.cta === "string" && body.cta.trim()) ||
      analysisResult?.cta?.trim() ||
      undefined;
    const durationFromPlan =
      typeof videoPlan?.duration === "number" && videoPlan.duration > 0
        ? videoPlan.duration
        : undefined;
    const styleFromPlan =
      typeof videoPlan?.style === "string" && videoPlan.style.trim()
        ? videoPlan.style.trim()
        : undefined;

    const result = await runCreateSalesVideo({
      product_name: productName,
      description,
      target,
      platform: body.platform,
      image,
      duration_sec: body.duration_sec ?? durationFromPlan,
      motion:
        typeof body.motion === "string" && body.motion.trim()
          ? body.motion.trim()
          : undefined,
      style:
        typeof body.style === "string" && body.style.trim()
          ? body.style.trim()
          : typeof body.motion === "string" && body.motion.trim()
            ? body.motion.trim()
            : styleFromPlan,
      product_id:
        (typeof body.product_id === "string" && body.product_id.trim()) ||
        productData?.id ||
        undefined,
      source_url:
        (typeof body.source_url === "string" && body.source_url.trim()) ||
        productData?.url ||
        undefined,
      thumbnail_url:
        (typeof body.thumbnail_url === "string" &&
          body.thumbnail_url.trim()) ||
        productData?.image ||
        undefined,
      hook: hook || undefined,
      cta: cta || undefined,
      script:
        typeof body.script === "string" && body.script.trim()
          ? body.script.trim()
          : undefined,
      hashtags:
        typeof body.hashtags === "string" && body.hashtags.trim()
          ? body.hashtags.trim()
          : undefined,
      video_style:
        (typeof body.video_style === "string" && body.video_style.trim()) ||
        (typeof body.video_type === "string" && body.video_type.trim()) ||
        styleFromPlan ||
        analysisResult?.recommendedVideoType ||
        undefined,
      video_type:
        (typeof body.video_type === "string" && body.video_type.trim()) ||
        (typeof body.video_style === "string" && body.video_style.trim()) ||
        styleFromPlan ||
        analysisResult?.recommendedVideoType ||
        undefined,
      speaker:
        typeof body.speaker === "string" && body.speaker.trim()
          ? body.speaker.trim()
          : undefined,
      captions_enabled:
        body.captions_enabled === undefined
          ? undefined
          : Boolean(body.captions_enabled),
      bgm:
        typeof body.bgm === "string" && body.bgm.trim()
          ? body.bgm.trim()
          : undefined,
      user_id: userId,
      watermark_required: watermarkRequired,
      productData,
      analysisResult,
      videoPlan,
      productAnalysis,
    });

    // 成功かつ generated_videos 保存時のみカウント（失敗はカウントしない）
    if (result.success && result.steps?.saved) {
      const consumed = await consumeVideoUsage(
        userId,
        {
          product_id: result.product_id,
          video_id: result.video_id,
          video_url: result.video_url,
          provider: result.provider,
          watermark_applied: result.watermark_applied,
        },
        { email: user.email }
      );
      if (!consumed.ok) {
        console.warn(
          "[create-sales-video] usage consume failed:",
          consumed.error
        );
      }
    }

    console.log(
      `[create-sales-video] success=${result.success} ` +
        `provider=${result.provider ?? "n/a"} ` +
        `product_id=${result.product_id ?? "null"} ` +
        `video_url=${result.video_url ?? "null"} ` +
        `watermark_applied=${result.watermark_applied} ` +
        `score=${result.score} elapsed_ms=${result.elapsed_ms}`
    );

    return NextResponse.json({
      success: result.success,
      product_id: result.product_id ?? "",
      scenario_id: result.scenario_id ?? "",
      video_id: result.video_id ?? "",
      video_url: result.video_url ?? "",
      audio_url: result.audio_url ?? "",
      score: result.score,
      selling_angle: result.selling_angle,
      hook: result.hook,
      steps: result.steps,
      warnings: result.warnings,
      provider: result.provider ?? null,
      final_video_url: result.final_video_url ?? null,
      watermark_applied: Boolean(result.watermark_applied),
      elapsed_ms: result.elapsed_ms || Date.now() - startedAt,
      usage: {
        plan: limit.plan,
        used: limit.used,
        video_limit: limit.video_limit,
        remaining: Math.max(0, limit.remaining - (result.steps?.saved ? 1 : 0)),
      },
    });
  } catch (error) {
    console.error(
      `[create-sales-video] error elapsed_ms=${Date.now() - startedAt}`,
      error
    );

    return NextResponse.json(
      emptyFailureBody(
        error instanceof Error ? error.message : String(error),
        Date.now() - startedAt
      ),
      { status: 500 }
    );
  }
}
