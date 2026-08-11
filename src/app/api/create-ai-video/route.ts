import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateAiVideo, resolveProviderId } from "@/lib/video-generation";
import { parseSalesScenarioFromBody } from "@/lib/video-scenario";
import {
  generateSalesNarration,
  parseNarrationInputFromBody,
} from "@/lib/voice-narration";
import { composeSalesVideo } from "@/lib/video-composer";
import { requireAuthUser } from "@/lib/auth/session";
import { checkVideoLimit, consumeVideoUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_DURATION_SEC = 15;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let requestedProvider: string | null = null;
  let usedProvider: string | null = null;

  try {
    const body = await req.json();

    const user = await requireAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です", login_url: "/login" },
        { status: 401 }
      );
    }

    const limit = await checkVideoLimit(user.id);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error:
            limit.reason ??
            "動画生成の利用上限に達しています。プランのアップグレードまたはクレジット追加が必要です。",
          plan: limit.plan,
          video_limit: limit.video_limit,
          used: limit.used,
          remaining: limit.remaining,
        },
        { status: 402 }
      );
    }

    // 互換: image_base64 または image
    const imageBase64 = String(body.image_base64 ?? body.image ?? "");
    const motion = String(body.motion ?? "");
    const productHint = String(body.product_name ?? "");
    const description = String(body.description ?? "");
    const durationSec = Number(body.duration_sec) || DEFAULT_DURATION_SEC;
    const provider = body.provider ?? null;
    const salesScenario = parseSalesScenarioFromBody(body.sales_scenario);
    const scenarioUsed = Boolean(salesScenario?.kling_prompt);
    const promptOverride = salesScenario?.kling_prompt ?? null;

    // 任意: ナレーション生成（失敗しても動画は返す）
    const wantNarration =
      body.generate_narration === true ||
      body.generate_audio === true ||
      Boolean(parseNarrationInputFromBody(body as Record<string, unknown>));

    if (!imageBase64) {
      return NextResponse.json(
        { error: "image_base64（または image）は必須です（商品画像）" },
        { status: 400 }
      );
    }

    // シナリオの kling_prompt がある場合は motion 不要
    if (!scenarioUsed && !motion.trim()) {
      return NextResponse.json(
        {
          error:
            "motion（動き指定）は必須です（sales_scenario.kling_prompt がない場合）",
        },
        { status: 400 }
      );
    }

    const safeDuration = Math.min(20, Math.max(5, durationSec));
    const resolvedProvider = resolveProviderId(provider);
    requestedProvider = resolvedProvider;

    const effectiveMotion = motion.trim()
      ? motion
      : salesScenario?.hook_0_2sec ||
        salesScenario?.selling_angle ||
        "sales scenario";

    console.log(
      `[create-ai-video] start requested_provider=${resolvedProvider} ` +
        `user_id=${user.id} scenario_used=${scenarioUsed} want_narration=${wantNarration}` +
        (description ? ` has_description=true` : "")
    );

    const result = await generateAiVideo({
      imageBase64,
      motion: effectiveMotion,
      productName: productHint,
      durationSec: safeDuration,
      provider,
      promptOverride,
    });

    usedProvider = result.provider;

    const consumed = await consumeVideoUsage(user.id, {
      provider: result.provider,
      product_name: productHint,
    });
    if (!consumed.ok) {
      console.warn(
        "[create-ai-video] usage consume failed:",
        consumed.error
      );
    }

    const isMock = result.provider === "mock";
    const usedRealApi = !isMock;
    const mode = isMock
      ? result.fallback_from
        ? "mock_fallback"
        : "mock"
      : "real_api";

    const dir = path.join(process.cwd(), "public", "generated", "videos");
    await mkdir(dir, { recursive: true });

    const filename = `zenova-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`;
    const filepath = path.join(dir, filename);
    await writeFile(filepath, result.videoBytes);

    const publicUrl = `/generated/videos/${filename}`;

    let audioUrl: string | null = null;
    let voiceProvider: "elevenlabs" | null = null;
    let narrationScript: string | null = null;

    if (wantNarration) {
      const narrationInput =
        parseNarrationInputFromBody(body as Record<string, unknown>) ||
        (salesScenario
          ? {
              optimized_hook: salesScenario.hook_0_2sec,
              optimized_scene_1: salesScenario.scene_1,
              optimized_scene_2: salesScenario.scene_2,
              optimized_scene_3: salesScenario.scene_3,
              optimized_cta: salesScenario.cta,
              product_name: productHint || undefined,
              generate_audio: true,
            }
          : null);

      if (
        narrationInput &&
        narrationInput.optimized_hook &&
        narrationInput.optimized_scene_1 &&
        narrationInput.optimized_scene_2 &&
        narrationInput.optimized_scene_3 &&
        narrationInput.optimized_cta
      ) {
        const narration = await generateSalesNarration(narrationInput);
        audioUrl = narration.audio_url;
        voiceProvider = narration.voice_provider;
        narrationScript = narration.script;
      }
    }

    // 任意: 動画+音声+字幕合成（失敗しても元動画は返す）
    let finalVideoUrl = publicUrl;
    let audioMerged = false;
    let captionsBurned = false;
    let subtitleFile: string | null = null;
    try {
      const composed = await composeSalesVideo({
        video_url: publicUrl,
        audio_url: audioUrl,
        narration_script: narrationScript,
        subtitle_file: body.subtitle_file ?? null,
        burn_captions: body.burn_captions,
      });
      finalVideoUrl = composed.final_video_url;
      audioMerged = composed.audio_merged;
      captionsBurned = composed.captions_burned;
      subtitleFile = composed.subtitle_file;
    } catch (composeError) {
      console.error(
        "[create-ai-video] video-composer failed (non-fatal):",
        composeError
      );
      finalVideoUrl = publicUrl;
      audioMerged = false;
      captionsBurned = false;
      subtitleFile = null;
    }

    const elapsedMs = Date.now() - startedAt;

    console.log(
      `[create-ai-video] done provider=${result.provider} mode=${mode} ` +
        `used_real_api=${usedRealApi} is_mock=${isMock} ` +
        `scenario_used=${scenarioUsed} audio_url=${audioUrl ?? "null"} ` +
        `final_video_url=${finalVideoUrl} audio_merged=${audioMerged} ` +
        `captions_burned=${captionsBurned} ` +
        `elapsed_ms=${elapsedMs}` +
        (result.fallback_from
          ? ` fallback_from=${result.fallback_from}`
          : "")
    );

    return NextResponse.json({
      video_url: publicUrl,
      filename,
      duration_sec: safeDuration,
      motion: effectiveMotion,
      prompt: result.prompt,
      // 使用した provider（kling / luma / mock）
      provider: result.provider,
      requested_provider: resolvedProvider,
      model: result.model,
      remote_url: result.remoteUrl ?? null,
      fallback_from: result.fallback_from ?? null,
      fallback_error: result.fallback_error ?? null,
      // 動作確認用（既存フィールドは維持したまま追加）
      is_mock: isMock,
      used_real_api: usedRealApi,
      mode,
      elapsed_ms: elapsedMs,
      meta: result.meta ?? null,
      // 販売シナリオ接続（追加フィールド）
      scenario_used: scenarioUsed,
      selling_angle: salesScenario?.selling_angle || "",
      hook: salesScenario?.hook_0_2sec || "",
      // ナレーション（追加・音声なしでも null で返す）
      audio_url: audioUrl,
      voice_provider: voiceProvider,
      narration_script: narrationScript,
      // 合成結果（追加）
      final_video_url: finalVideoUrl,
      audio_merged: audioMerged,
      captions_burned: captionsBurned,
      subtitle_file: subtitleFile,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(
      `[create-ai-video] error requested_provider=${requestedProvider ?? "unknown"} ` +
        `used_provider=${usedProvider ?? "none"} elapsed_ms=${elapsedMs}`,
      error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        provider: usedProvider,
        requested_provider: requestedProvider,
        elapsed_ms: elapsedMs,
        audio_url: null,
        voice_provider: null,
      },
      {
        status: 500,
      }
    );
  }
}
