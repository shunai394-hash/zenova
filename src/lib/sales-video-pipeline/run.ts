import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  analyzeProduct,
  normalizeProductAnalysis,
  saveProductAnalysis,
  type ProductAnalysis,
} from "@/lib/product-analysis";
import {
  getClaimBucketsFromAnalysis,
} from "@/lib/product-analysis/factual-gate";
import {
  validateKlingPromptClaims,
  validateNarrationScript,
  validateOptimizeClaims,
  validateSalesScenarioClaims,
  validateVideoClaimText,
  validateVideoPlanClaims,
} from "@/lib/product-analysis/validate-video-claims";
import {
  generateSalesScenario,
  optimizeSalesScenario,
} from "@/lib/video-scenario";
import { generateAiVideo } from "@/lib/video-generation";
import { generateSalesNarration } from "@/lib/voice-narration";
import { generateVideoCaptions } from "@/lib/video-caption";
import { composeSalesVideo } from "@/lib/video-composer";
import { analyzeVideoPerformance } from "@/lib/video-performance";
import {
  ensureProductRow,
  saveGeneratedVideo,
  saveSalesScenario,
} from "@/lib/sales-data";
import { resolveSpeakerVoiceId } from "@/lib/analyze/video-settings";
import { buildStyleAwareKlingPrompt } from "@/lib/analyze/style-templates";
import type {
  CreateSalesVideoInput,
  CreateSalesVideoResult,
  CreateSalesVideoSteps,
} from "./types";

function stripDataUrl(image: string): string {
  return image.replace(/^data:image\/\w+;base64,/, "");
}

function emptySteps(): CreateSalesVideoSteps {
  return {
    analysis: false,
    scenario: false,
    kling: false,
    narration: false,
    captions: false,
    evaluation: false,
    saved: false,
  };
}

/**
 * 商品分析 → シナリオ → 最適化 → Kling → 音声 → 字幕 → 合成 → 評価 → 保存
 * 既存 API / Kling provider は変更せず、lib を直接呼び出す。
 */
export async function runCreateSalesVideo(
  input: CreateSalesVideoInput
): Promise<CreateSalesVideoResult> {
  const startedAt = Date.now();
  const steps = emptySteps();
  const warnings: string[] = [];

  const productName =
    String(input.product_name ?? "").trim() ||
    input.productData?.name?.trim() ||
    "";
  const description =
    String(input.description ?? "").trim() ||
    input.productData?.description?.trim() ||
    "";
  const target =
    String(input.target ?? "").trim() ||
    input.productData?.target?.trim() ||
    input.analysisResult?.targetAudience?.trim() ||
    "";
  const platform = (input.platform || "TikTok").trim() || "TikTok";
  const imageBase64 = stripDataUrl(String(input.image ?? "").trim());
  const durationSec = Math.min(
    60,
    Math.max(
      5,
      Number(input.duration_sec) ||
        Number(input.videoPlan?.duration) ||
        15
    )
  );
  const captionsEnabled =
    input.captions_enabled === undefined
      ? true
      : Boolean(input.captions_enabled);
  const videoStyleId =
    (typeof input.video_style === "string" && input.video_style.trim()) ||
    (typeof input.video_type === "string" && input.video_type.trim()) ||
    input.videoPlan?.style?.trim() ||
    input.analysisResult?.recommendedVideoType?.trim() ||
    "";
  const speakerId =
    typeof input.speaker === "string" && input.speaker.trim()
      ? input.speaker.trim()
      : "female";
  const bgmId =
    typeof input.bgm === "string" && input.bgm.trim()
      ? input.bgm.trim()
      : "none";
  const styleLabel =
    (typeof input.style === "string" && input.style.trim()) ||
    videoStyleId ||
    (typeof input.motion === "string" && input.motion.trim()) ||
    null;
  const sourceUrl =
    (typeof input.source_url === "string" && input.source_url.trim()) ||
    input.productData?.url?.trim() ||
    null;
  const thumbnailUrl =
    (typeof input.thumbnail_url === "string" && input.thumbnail_url.trim()) ||
    input.productData?.image?.trim() ||
    null;
  const userId =
    typeof input.user_id === "string" && input.user_id.trim()
      ? input.user_id.trim()
      : null;
  const preferredProductId =
    (typeof input.product_id === "string" && input.product_id.trim()) ||
    input.productData?.id?.trim() ||
    null;
  const userHook =
    (typeof input.hook === "string" && input.hook.trim()) ||
    input.analysisResult?.hook?.trim() ||
    "";
  const userCta =
    (typeof input.cta === "string" && input.cta.trim()) ||
    input.analysisResult?.cta?.trim() ||
    "";
  const userScript =
    typeof input.script === "string" && input.script.trim()
      ? input.script.trim()
      : "";
  const userHashtags =
    typeof input.hashtags === "string" && input.hashtags.trim()
      ? input.hashtags.trim()
      : "";

  if (!productName) throw new Error("product_name は必須です");
  if (!description) throw new Error("description は必須です");
  if (!target) throw new Error("target は必須です");
  if (!imageBase64) {
    throw new Error(
      "商品画像が必要です。画像をアップロードするか、URLから画像を取得してください。"
    );
  }

  let productId: string | null = preferredProductId;
  let scenarioId: string | null = null;
  let videoId: string | null = null;
  let videoUrl: string | null = null;
  let audioUrl: string | null = null;
  let finalVideoUrl: string | null = null;
  let remoteUrl: string | null = null;
  let provider: string | null = null;
  let score = 0;
  let sellingAngle = "";
  let hook = "";
  let watermarkApplied = false;
  let narrationScript = "";

  // 1) 商品分析（確定済み ProductAnalysis があれば再生成しない = 事実ドリフト防止）
  let analysis: ProductAnalysis;
  if (input.productAnalysis && input.productAnalysis.productName) {
    analysis = normalizeProductAnalysis(input.productAnalysis);
    steps.analysis = true;
  } else {
    analysis = await analyzeProduct({
      product_name: productName,
      description,
      target,
      platform,
      image_name: "sales-video.jpg",
      source: "manual",
    });
    steps.analysis = true;
  }

  try {
    const savedProduct = await saveProductAnalysis({
      product_name: productName,
      description,
      target,
      platform,
      image_name: "sales-video.jpg",
      analysis,
    });
    productId = savedProduct.id;
  } catch (error) {
    warnings.push(
      `product save: ${error instanceof Error ? error.message : String(error)}`
    );
    try {
      productId = await ensureProductRow({
        product_name: productName,
        description,
        target,
        platform,
        image_name: "sales-video.jpg",
      });
    } catch (ensureError) {
      warnings.push(
        `ensure product: ${
          ensureError instanceof Error
            ? ensureError.message
            : String(ensureError)
        }`
      );
    }
  }

  // 2) 販売シナリオ（confirmed 正本 + 事後ゲート）
  const claimBuckets = getClaimBucketsFromAnalysis(analysis);
  const claimCtx = {
    productName,
    target,
    analysis,
    buckets: claimBuckets,
  };

  // 入力 VideoPlan も最終ゲート前に一度検査（後工程への汚染防止）
  let gatedVideoPlan = input.videoPlan
    ? validateVideoPlanClaims(input.videoPlan, claimCtx)
    : null;

  const planTimeline = gatedVideoPlan?.timeline ?? [];
  let scenario = await generateSalesScenario({
    product_name: productName,
    description,
    target,
    platform,
    image_name: "sales-video.jpg",
    analysis: {
      summary: analysis.summary,
      salesAngle: analysis.salesAngle,
      sellingPoints: claimBuckets.confirmed.length
        ? claimBuckets.confirmed
        : analysis.sellingPoints,
      painPoints: analysis.painPoints,
      targetInsight: analysis.targetInsight,
      cta: analysis.cta,
      recommendedVideoStructure: analysis.recommendedVideoStructure,
      confirmed: claimBuckets.confirmed,
      excluded: claimBuckets.excluded,
      productAnalysis: analysis,
    },
  });
  scenario = validateSalesScenarioClaims(scenario, claimCtx);

  // 3) 最適化（表現のみ。事実追加禁止 + ゲート）
  const planHook =
    planTimeline.find((t) => /フック|Hook|問題|Before/i.test(t.scene))?.text ||
    planTimeline[0]?.text ||
    "";
  const planScenes = planTimeline.filter(
    (t) => !/フック|Hook|CTA|誘導/i.test(t.scene)
  );
  const planCta =
    planTimeline.find((t) => /CTA|誘導/i.test(t.scene))?.text ||
    gatedVideoPlan?.cta ||
    "";

  const priorForOptimize = {
    hook: validateVideoClaimText(
      userHook || planHook || scenario.hook_0_2sec,
      claimCtx
    ) || scenario.hook_0_2sec,
    scene_1: validateVideoClaimText(
      planScenes[0]?.text || scenario.scene_1,
      claimCtx
    ) || scenario.scene_1,
    scene_2: validateVideoClaimText(
      planScenes[1]?.text || scenario.scene_2,
      claimCtx
    ) || scenario.scene_2,
    scene_3: validateVideoClaimText(
      planScenes[2]?.text || scenario.scene_3,
      claimCtx
    ) || scenario.scene_3,
    cta: validateVideoClaimText(
      userCta || planCta || scenario.cta,
      claimCtx
    ) || scenario.cta,
  };

  let optimized = await optimizeSalesScenario({
    product_name: productName,
    description,
    target_customer: scenario.target_customer || target,
    selling_angle: scenario.selling_angle,
    hook: priorForOptimize.hook,
    scene_1: priorForOptimize.scene_1,
    scene_2: priorForOptimize.scene_2,
    scene_3: priorForOptimize.scene_3,
    cta: priorForOptimize.cta,
    confirmed: claimBuckets.confirmed,
    excluded: claimBuckets.excluded,
    productAnalysis: analysis,
  });
  optimized = validateOptimizeClaims(optimized, claimCtx, priorForOptimize);
  steps.scenario = true;

  sellingAngle =
    validateVideoClaimText(scenario.selling_angle, claimCtx) ||
    scenario.selling_angle;
  hook =
    validateVideoClaimText(
      userHook || planHook || optimized.optimized_hook || scenario.hook_0_2sec,
      claimCtx
    ) || optimized.optimized_hook;
  let finalCta =
    validateVideoClaimText(
      userCta || planCta || optimized.optimized_cta || scenario.cta,
      claimCtx
    ) || optimized.optimized_cta;

  // FINAL factual gate: 完成 VideoPlan 全体を1回検査してから Kling へ
  gatedVideoPlan = validateVideoPlanClaims(
    {
      title: gatedVideoPlan?.title || productName,
      style: gatedVideoPlan?.style || videoStyleId || "ugc",
      duration: gatedVideoPlan?.duration || durationSec,
      ideaId: gatedVideoPlan?.ideaId,
      goal: gatedVideoPlan?.goal,
      cta: finalCta,
      timeline: [
        { scene: "Hook", second: "0-2", text: hook },
        {
          scene: "Scene1",
          second: "2-6",
          text: optimized.optimized_scene_1,
        },
        {
          scene: "Scene2",
          second: "6-10",
          text: optimized.optimized_scene_2,
        },
        {
          scene: "Scene3",
          second: "10-13",
          text: optimized.optimized_scene_3,
        },
        { scene: "CTA", second: "13-15", text: finalCta },
      ],
    },
    claimCtx
  );
  hook =
    gatedVideoPlan.timeline.find((t) => /Hook|フック/i.test(t.scene))?.text ||
    hook;
  optimized = {
    ...optimized,
    optimized_hook: hook,
    optimized_scene_1:
      gatedVideoPlan.timeline.find((t) => /Scene1/i.test(t.scene))?.text ||
      optimized.optimized_scene_1,
    optimized_scene_2:
      gatedVideoPlan.timeline.find((t) => /Scene2/i.test(t.scene))?.text ||
      optimized.optimized_scene_2,
    optimized_scene_3:
      gatedVideoPlan.timeline.find((t) => /Scene3/i.test(t.scene))?.text ||
      optimized.optimized_scene_3,
    optimized_cta: gatedVideoPlan.cta || finalCta,
  };
  finalCta = optimized.optimized_cta;

  try {
    if (!productId) {
      productId = await ensureProductRow({
        product_name: productName,
        description,
        target,
        platform,
      });
    }
    const savedScenario = await saveSalesScenario({
      product_id: productId,
      hook,
      selling_angle: sellingAngle,
      scene_1: optimized.optimized_scene_1,
      scene_2: optimized.optimized_scene_2,
      scene_3: optimized.optimized_scene_3,
      cta: finalCta,
      kling_prompt: optimized.optimized_kling_prompt,
      target_customer: scenario.target_customer,
    });
    scenarioId = savedScenario.id;
  } catch (error) {
    warnings.push(
      `scenario save: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // 4) Kling（または mock）動画生成
  // style → confirmed 付きプロンプト → Kling専用 claim gate → プロバイダ
  const baseKling = optimized.optimized_kling_prompt || scenario.kling_prompt;
  const styledKlingPrompt = buildStyleAwareKlingPrompt({
    videoStyle: videoStyleId || "ugc",
    basePrompt: baseKling,
    productName,
    durationSec,
    confirmed: claimBuckets.confirmed,
    excluded: claimBuckets.excluded,
  });
  const klingPrompt = validateKlingPromptClaims(styledKlingPrompt, claimCtx);
  const motionHint =
    (typeof input.motion === "string" && input.motion.trim()) ||
    hook;
  const videoResult = await generateAiVideo({
    imageBase64,
    motion: motionHint,
    productName,
    durationSec,
    provider: null,
    promptOverride: klingPrompt,
  });  provider = videoResult.provider;

  const videosDir = path.join(process.cwd(), "public", "generated", "videos");
  await mkdir(videosDir, { recursive: true });
  const rawFilename = `zenova-sales-raw-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`;
  await writeFile(path.join(videosDir, rawFilename), videoResult.videoBytes);
  videoUrl = `/generated/videos/${rawFilename}`;
  remoteUrl = videoResult.remoteUrl ?? null;
  steps.kling = true;

  // 5) ElevenLabs ナレーション（失敗しても継続）
  try {
    const voiceId = resolveSpeakerVoiceId(
      speakerId === "male" || speakerId === "ai" || speakerId === "female"
        ? speakerId
        : "female"
    );
    const narration = await generateSalesNarration({
      product_name: productName,
      optimized_hook: hook,
      optimized_scene_1: optimized.optimized_scene_1,
      optimized_scene_2: optimized.optimized_scene_2,
      optimized_scene_3: optimized.optimized_scene_3,
      optimized_cta: finalCta,
      script_override: userScript
        ? validateNarrationScript(userScript, claimCtx)
        : undefined,
      voice_id: voiceId,
      generate_audio: true,
      confirmed: claimBuckets.confirmed,
      excluded: claimBuckets.excluded,
      productAnalysis: analysis,
    });
    narrationScript = validateNarrationScript(narration.script, claimCtx);
    audioUrl = narration.audio_url;
    if (narration.audio_url) {
      steps.narration = true;
    } else {
      warnings.push(
        `narration: ${narration.skip_reason ?? "audio_url null"}`
      );
    }
  } catch (error) {
    warnings.push(
      `narration: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // 保存用スクリプト（台本 + ハッシュタグ）
  const scriptForSave = [narrationScript, userHashtags]
    .filter(Boolean)
    .join("\n\n");

  // 6) 字幕（失敗しても継続 / captions_enabled=false ならスキップ）
  let subtitleFile: string | null = null;
  if (!captionsEnabled) {
    warnings.push("captions: skipped (captions_enabled=false)");
  } else {
    try {
      const captions = await generateVideoCaptions({
        narration_script:
          narrationScript ||
          validateNarrationScript(
            [hook, optimized.optimized_scene_1, finalCta]
              .filter(Boolean)
              .join("。"),
            claimCtx
          ),
        duration: durationSec,
        scenes: [
          optimized.optimized_scene_1,
          optimized.optimized_scene_2,
          optimized.optimized_scene_3,
        ].map((s) => validateVideoClaimText(s, claimCtx) || s),
      });
      subtitleFile = captions.subtitle_file;
      steps.captions = true;
    } catch (error) {
      warnings.push(
        `captions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (bgmId !== "none") {
    // FUTURE(BGM): composeSalesVideo に bgm_track を渡し ffmpeg で mix する
    warnings.push(
      `bgm: ${bgmId} は設定を受け取りました（合成は開発中。現状はナレーション優先）`
    );
  }

  // 7) video-composer
  const watermarkRequired = Boolean(input.watermark_required);
  try {
    const composed = await composeSalesVideo({
      video_url: videoUrl,
      audio_url: audioUrl,
      narration_script: narrationScript || null,
      subtitle_file: subtitleFile,
      burn_captions: captionsEnabled && Boolean(subtitleFile),
      watermark_required: watermarkRequired,
    });
    finalVideoUrl = composed.final_video_url;
    videoUrl = composed.final_video_url;
    watermarkApplied = Boolean(composed.watermark_applied);
  } catch (error) {
    warnings.push(
      `composer: ${error instanceof Error ? error.message : String(error)}`
    );
    finalVideoUrl = videoUrl;
    watermarkApplied = false;
  }

  // 8) 評価
  try {
    const evaluation = await analyzeVideoPerformance({
      product_name: productName,
      selling_angle: sellingAngle,
      hook,
      scenes: [
        optimized.optimized_scene_1,
        optimized.optimized_scene_2,
        optimized.optimized_scene_3,
      ],
      cta: finalCta,
      video_url: videoUrl,
      narration_script: narrationScript || null,
    });
    score = evaluation.overall_score;
    steps.evaluation = true;

    // 9) generated_videos 保存
    try {
      if (!productId) {
        productId = await ensureProductRow({
          product_name: productName,
          description,
          target,
          platform,
        });
      }
      const savedVideo = await saveGeneratedVideo({
        product_id: productId,
        video_url: finalVideoUrl || videoUrl || "",
        audio_url: audioUrl,
        score: evaluation.overall_score,
        hook_score: evaluation.hook_score,
        product_score: evaluation.product_score,
        cta_score: evaluation.cta_score,
        tiktok_score: evaluation.tiktok_score,
        scenario_id: scenarioId,
        narration_script: narrationScript || null,
        user_id: userId,
        product_name: productName,
        source_url: sourceUrl,
        thumbnail_url: thumbnailUrl,
        script: scriptForSave || narrationScript || null,
        hook,
        style: styleLabel,
        status: "completed",
      });
      videoId = savedVideo.id;
      steps.saved = Boolean(productId && scenarioId && videoId);
    } catch (error) {
      warnings.push(
        `video save: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } catch (error) {
    warnings.push(
      `evaluation: ${error instanceof Error ? error.message : String(error)}`
    );
    // 評価失敗でも動画保存は試みる
    try {
      if (productId && videoUrl) {
        const savedVideo = await saveGeneratedVideo({
          product_id: productId,
          video_url: finalVideoUrl || videoUrl,
          audio_url: audioUrl,
          score: null,
          scenario_id: scenarioId,
          narration_script: narrationScript || null,
          user_id: userId,
          product_name: productName,
          source_url: sourceUrl,
          thumbnail_url: thumbnailUrl,
          script: scriptForSave || narrationScript || null,
          hook,
          style: styleLabel,
          status: "completed",
        });
        videoId = savedVideo.id;
        steps.saved = Boolean(productId && scenarioId && videoId);
      }
    } catch (saveError) {
      warnings.push(
        `video save: ${
          saveError instanceof Error ? saveError.message : String(saveError)
        }`
      );
    }
  }

  // product/scenario だけ保存できていれば部分 saved
  if (!steps.saved && productId && scenarioId) {
    steps.saved = false;
  }

  const success = steps.analysis && steps.scenario && steps.kling;

  return {
    success,
    product_id: productId,
    scenario_id: scenarioId,
    video_id: videoId,
    video_url: videoUrl,
    audio_url: audioUrl,
    score,
    selling_angle: sellingAngle,
    hook,
    steps,
    warnings,
    elapsed_ms: Date.now() - startedAt,
    watermark_applied: watermarkApplied,
    final_video_url: finalVideoUrl,
    remote_url: remoteUrl,
    provider,
  };
}
