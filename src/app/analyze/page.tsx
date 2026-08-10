"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AnalyzeStepBar } from "@/components/analyze/analyze-step-bar";
import { resolveAnalyzeStep, resolveGeneratePhase } from "@/lib/analyze/workspace";
import {
  buildCreativeDraft,
  emptyCreativeDraft,
  type CreativeDraft,
} from "@/lib/analyze/creative-draft";
import {
  buildAiPlanBrief,
  emptyAiPlanBrief,
  planBriefToCreativePayload,
  type AiPlanBrief,
} from "@/lib/analyze/plan-brief";
import {
  applyPlanBriefImprovements,
  scorePlanBrief,
} from "@/lib/analyze/plan-quality";
import {
  buildPostPrepSet,
  emptyPostPrepSet,
  type PostPrepSet,
} from "@/lib/analyze/post-prep";
import {
  buildPlanVariants,
  type PlanVariantId,
} from "@/lib/analyze/plan-variants";
import { buildAnalysisNarrative } from "@/lib/analyze/analysis-narrative";
import {
  buildPreviewHref,
  saveVideoPreviewPayload,
} from "@/lib/analyze/preview-session";
import {
  buildAnalysisResult,
  buildProductInput,
  buildVideoPlan,
  buildVideoPlanFromIdea,
  buildVideoResult,
  classifyPipelineError,
  generateVideoIdeas,
  getPipelineErrorMessage,
  validateBeforeGenerate,
  videoResultToPreviewPayload,
  type GenerationStatus,
  type VideoIdea,
} from "@/lib/video-pipeline";
import { isValidHttpUrl } from "@/lib/landing/upload";
import { AiPlanBriefPanel } from "@/components/analyze/ai-plan-brief";
import { AnalysisNarrative } from "@/components/analyze/analysis-narrative";
import { AnalysisInsightPanel } from "@/components/analyze/analysis-insight-panel";
import { GenerationPreview } from "@/components/analyze/generation-preview";
import { PlanQualityPanel } from "@/components/analyze/plan-quality-panel";
import { buildAnalysisInsightCard } from "@/lib/analyze/analysis-insight";
import { PlanVariantTabs } from "@/components/analyze/plan-variant-tabs";
import { PostPrepPanel } from "@/components/analyze/post-prep-panel";
import { ReferenceVideoCards } from "@/components/analyze/reference-video-cards";
import { UsageMeterBanner } from "@/components/analyze/usage-meter-banner";
import { VideoIdeaCards } from "@/components/analyze/video-idea-cards";
import { VideoSettingsPanel } from "@/components/analyze/video-settings-panel";
import { VideoStructurePreview } from "@/components/analyze/video-structure-preview";
import {
  DEFAULT_VIDEO_SETTINGS,
  getBgmLabel,
  getSpeakerLabel,
  getVideoStyleLabel,
  getVideoStyleMotion,
  normalizeVideoStyleId,
  type VideoSettings,
  type VideoStyleId,
} from "@/lib/analyze/video-settings";
import {
  recommendVideoSettings,
  type RecommendedVideoSettings,
} from "@/lib/analyze/recommend-settings";
import { resolveSampleTemplateKey } from "@/lib/landing/sample-videos";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildApiProductName,
  buildApiTarget,
  inferProductCategory,
  type AnalyzeProductResponse,
  type CategoryStat,
  type ProductAnalysis,
  type ProductPerformanceRecord,
  type SalesAngleStat,
} from "@/lib/product-analysis";
import type {
  DashboardProductItem,
  DashboardRankingItem,
  DashboardVideoScoreItem,
} from "@/lib/sales-data/dashboard-types";
import {
  appendTemplateToProductName,
  selectVideoTemplate,
  type TemplateSelectionResult,
} from "@/lib/video-template";

type HookItem = {
  hook: string;
  type: string;
  reason: string;
};

const PLATFORMS = [
  "TikTok",
  "YouTube Shorts",
  "Instagram Reels",
] as const;
const SALES_VIDEO_STEPS = [
  { key: "analysis", label: "商品分析" },
  { key: "scenario", label: "シナリオ生成・最適化" },
  { key: "kling", label: "Kling動画生成" },
  { key: "narration", label: "ナレーション" },
  { key: "captions", label: "字幕" },
  { key: "evaluation", label: "評価" },
  { key: "saved", label: "Supabase保存" },
] as const;

type SalesVideoStepKey = (typeof SALES_VIDEO_STEPS)[number]["key"];

type SalesVideoStepsState = Record<SalesVideoStepKey, boolean>;

const EMPTY_SALES_VIDEO_STEPS: SalesVideoStepsState = {
  analysis: false,
  scenario: false,
  kling: false,
  narration: false,
  captions: false,
  evaluation: false,
  saved: false,
};

const MOTION_PRESETS = [
  {
    id: "push-in",
    label: "ゆっくり寄る（Push-in）",
    value:
      "slow cinematic push-in toward the product, subtle parallax, soft handheld feel",
  },
  {
    id: "orbit",
    label: "商品の周りを回る",
    value:
      "gentle orbit around the product, showcase shape and texture, smooth camera move",
  },
  {
    id: "unbox",
    label: "開封・取り出し",
    value:
      "hands unboxing and lifting the product into frame, natural motion, close-up detail",
  },
  {
    id: "before-after",
    label: "使用シーン / Before→After",
    value:
      "person using the product in daily life, before-to-after feeling, energetic TikTok pacing",
  },
  {
    id: "custom",
    label: "カスタム指定",
    value: "",
  },
] as const;

const inputClassName =
  "w-full rounded bg-zinc-900 px-4 py-3 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-500 disabled:opacity-50";

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function buildSalesVideoDownloadName(productName: string): string {
  const safeName =
    productName
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40) || "product";
  const date = new Date().toISOString().slice(0, 10);
  return `zenova-${safeName}-${date}.mp4`;
}

async function downloadVideoFile(videoUrl: string, filename: string) {
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`動画の取得に失敗しました (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * 商品URL解析API接続用のプレースホルダ。
 * 後で `/api/parse-product-url` などに差し替え可能。
 */
async function fetchProductFromUrl(url: string): Promise<{
  productName?: string;
  description?: string;
  target?: string;
} | null> {
  void url;
  return null;
}

function AnalysisList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded border border-zinc-800 bg-black/40 p-4">
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-gray-400">
        {items.map((item) => (
          <li key={item}>・{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SalesScorePanel({ analysis }: { analysis: ProductAnalysis }) {
  const { salesScore } = analysis;
  const bars: { key: keyof typeof salesScore.breakdown; label: string }[] = [
    { key: "clarity", label: "訴求の明確さ" },
    { key: "demandFit", label: "需要適合" },
    { key: "differentiation", label: "差別化" },
    { key: "creativePotential", label: "動画適性" },
    { key: "conversionReadiness", label: "成約準備" },
  ];

  const baseTotal = salesScore.baseTotal ?? salesScore.total;
  const bonus = salesScore.performanceBonus ?? 0;

  return (
    <div className="rounded border border-zinc-800 bg-black/40 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-300">販売スコア</h3>
          <p className="mt-1 text-xs text-gray-500">
            JSON分析結果ベース · source: {analysis.source}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tracking-tight">
            {salesScore.total}
            <span className="ml-1 text-base font-medium text-gray-500">
              /100
            </span>
          </p>
          <p className="mt-1 text-sm text-gray-300">
            Grade {salesScore.grade} · {salesScore.label}
          </p>
          {(bonus > 0 || salesScore.baseTotal != null) && (
            <p className="mt-1 text-xs text-gray-500">
              分析ベース {baseTotal}
              {bonus > 0 ? ` · 実績 +${bonus}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {bars.map(({ key, label }) => {
          const value = salesScore.breakdown[key];
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-white/80"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 space-y-1 text-xs text-gray-400">
        {salesScore.tips.map((tip) => (
          <li key={tip}>・{tip}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [target, setTarget] = useState("");
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);

  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(
    null
  );

  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [creativeDraft, setCreativeDraft] = useState<CreativeDraft>(
    emptyCreativeDraft()
  );
  const [planBrief, setPlanBrief] = useState<AiPlanBrief>(emptyAiPlanBrief());
  const [postPrep, setPostPrep] = useState<PostPrepSet>(emptyPostPrepSet());
  const [planVariant, setPlanVariant] = useState<PlanVariantId>("ugc");
  const [selectedVideoIdea, setSelectedVideoIdea] = useState<VideoIdea | null>(
    null
  );
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(
    DEFAULT_VIDEO_SETTINGS
  );
  const [recommendedSettings, setRecommendedSettings] =
    useState<RecommendedVideoSettings | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [recentProducts, setRecentProducts] = useState<DashboardProductItem[]>(
    []
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [ranking, setRanking] = useState<DashboardRankingItem[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [popularAngles, setPopularAngles] = useState<SalesAngleStat[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [spotlight, setSpotlight] = useState<DashboardRankingItem[]>([]);
  const [videoScores, setVideoScores] = useState<DashboardVideoScoreItem[]>(
    []
  );
  const [dashboardWarning, setDashboardWarning] = useState<string | null>(
    null
  );

  const [perfViews, setPerfViews] = useState("0");
  const [perfLikes, setPerfLikes] = useState("0");
  const [perfComments, setPerfComments] = useState("0");
  const [perfClicks, setPerfClicks] = useState("0");
  const [perfSales, setPerfSales] = useState("0");
  const [perfRevenue, setPerfRevenue] = useState("0");
  const [perfNotes, setPerfNotes] = useState("");
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfHint, setPerfHint] = useState<string | null>(null);

  const [hooks, setHooks] = useState<HookItem[]>([]);
  const [video, setVideo] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateSelectionResult | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imagePromptUsed, setImagePromptUsed] = useState("");

  const [motionPresetId, setMotionPresetId] = useState<string>(
    MOTION_PRESETS[0].id
  );
  const [customMotion, setCustomMotion] = useState("");
  const [aiVideoSource, setAiVideoSource] = useState<
    "generated" | "upload"
  >("generated");
  const [aiVideoUrl, setAiVideoUrl] = useState<string | null>(null);
  const [aiVideoFilename, setAiVideoFilename] = useState<string | null>(null);
  const [aiVideoLoading, setAiVideoLoading] = useState(false);

  const [salesVideoLoading, setSalesVideoLoading] = useState(false);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [salesVideoSteps, setSalesVideoSteps] = useState<SalesVideoStepsState>(
    EMPTY_SALES_VIDEO_STEPS
  );
  const [salesVideoUrl, setSalesVideoUrl] = useState<string | null>(null);
  const [salesVideoScore, setSalesVideoScore] = useState<number | null>(null);
  const [salesVideoHook, setSalesVideoHook] = useState<string | null>(null);
  const [salesVideoAngle, setSalesVideoAngle] = useState<string | null>(null);
  const [salesVideoError, setSalesVideoError] = useState<string | null>(null);
  const [enginePrepMessage, setEnginePrepMessage] = useState<string | null>(
    null
  );
  const [salesVideoProgressIndex, setSalesVideoProgressIndex] = useState(0);
  const [salesVideoDownloading, setSalesVideoDownloading] = useState(false);
  const [usageRefreshToken, setUsageRefreshToken] = useState(0);

  const [urlLoading, setUrlLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlHint, setUrlHint] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const productQueryHandled = useRef(false);
  /** TOPギャラリー等から ?template= で渡されたスタイル（分析おすすめより優先） */
  const preferredTemplateRef = useRef<VideoStyleId | null>(null);

  const busy =
    urlLoading ||
    analyzeLoading ||
    planLoading ||
    imageLoading ||
    aiVideoLoading ||
    salesVideoLoading ||
    historyLoading ||
    perfLoading;

  const loadDashboard = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    setDashboardWarning(null);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();

      setTotalProducts(
        typeof data?.totals?.products === "number" ? data.totals.products : 0
      );
      setTotalAnalyses(
        typeof data?.totals?.analyses === "number" ? data.totals.analyses : 0
      );
      setTotalVideos(
        typeof data?.totals?.generated_videos === "number"
          ? data.totals.generated_videos
          : 0
      );
      setRanking(
        Array.isArray(data?.ranking)
          ? (data.ranking as DashboardRankingItem[])
          : []
      );
      setRecentProducts(
        Array.isArray(data?.recent_products)
          ? (data.recent_products as DashboardProductItem[])
          : []
      );
      setVideoScores(
        Array.isArray(data?.video_scores)
          ? (data.video_scores as DashboardVideoScoreItem[])
          : []
      );
      setSpotlight(
        Array.isArray(data?.spotlight)
          ? (data.spotlight as DashboardRankingItem[])
          : []
      );
      setCategories(
        Array.isArray(data?.categories)
          ? (data.categories as CategoryStat[])
          : []
      );
      setPopularAngles(
        Array.isArray(data?.popular_angles)
          ? (data.popular_angles as SalesAngleStat[])
          : []
      );

      if (Array.isArray(data?.warnings) && data.warnings.length > 0) {
        setDashboardWarning(String(data.warnings[0]));
      }
    } catch (err) {
      setTotalProducts(0);
      setTotalAnalyses(0);
      setTotalVideos(0);
      setRanking([]);
      setRecentProducts([]);
      setVideoScores([]);
      setSpotlight([]);
      setCategories([]);
      setPopularAngles([]);
      setHistoryError(err instanceof Error ? err.message : String(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshDashboardData = async () => {
    await loadDashboard();
  };

  useEffect(() => {
    void refreshDashboardData();
  }, []);

  useEffect(() => {
    if (!salesVideoLoading) return;
    setSalesVideoProgressIndex(0);
    const timer = window.setInterval(() => {
      setSalesVideoProgressIndex((prev) =>
        Math.min(prev + 1, SALES_VIDEO_STEPS.length - 1)
      );
    }, 12000);
    return () => window.clearInterval(timer);
  }, [salesVideoLoading]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (productImagePreview) URL.revokeObjectURL(productImagePreview);
    };
  }, [imageUrl, productImagePreview]);

  const canAnalyze =
    productName.trim().length > 0 &&
    description.trim().length > 0 &&
    target.trim().length > 0 &&
    platform.trim().length > 0 &&
    !busy;

  const selectedMotion =
    motionPresetId === "custom"
      ? customMotion.trim()
      : getVideoStyleMotion(videoSettings.video_style) ||
        MOTION_PRESETS.find((item) => item.id === motionPresetId)?.value ||
        "";

  const canCreateSalesVideo =
    Boolean(analysis) &&
    productName.trim().length > 0 &&
    description.trim().length > 0 &&
    target.trim().length > 0 &&
    platform.trim().length > 0 &&
    Boolean(productImage || productImagePreview || imageBlob || imageUrl) &&
    selectedMotion.length > 0 &&
    !busy;

  const canSubmitPlan = Boolean(analysis) && !busy;

  const canCreateImage =
    Boolean(analysis) &&
    (hooks.length > 0 || video.trim().length > 0) &&
    !busy;

  const canCreateAiVideo =
    Boolean(imageUrl || productImage) &&
    selectedMotion.length > 0 &&
    !busy &&
    (aiVideoSource === "generated" ? Boolean(imageBlob || imageUrl) : Boolean(productImage));

  const stepLabel = useMemo(() => {
    if (!analysis) return "STEP 1 / 商品分析";
    if (!hooks.length && !video) return "STEP 2 / 動画企画";
    if (!imageUrl) return "STEP 3 / 販売ビジュアル";
    return "STEP 4 / AI動画生成";
  }, [analysis, hooks.length, video, imageUrl]);

  const analysisJson = useMemo(
    () => (analysis ? JSON.stringify(analysis, null, 2) : ""),
    [analysis]
  );

  const planQuality = useMemo(
    () => scorePlanBrief(planBrief),
    [planBrief]
  );

  const analysisNarrative = useMemo(() => {
    if (!analysis) return "";
    return buildAnalysisNarrative({
      analysis,
      brief: planBrief,
      settings: videoSettings,
    });
  }, [analysis, planBrief, videoSettings]);

  const planVariants = useMemo(() => {
    if (!analysis) return [];
    const base = buildAiPlanBrief({
      analysis,
      formTarget: target,
      platform,
    });
    return buildPlanVariants({ base, analysis });
  }, [analysis, target, platform]);

  const analysisInsight = useMemo(() => {
    if (!analysis) return null;
    return buildAnalysisInsightCard({
      analysis,
      recommendedStyle:
        recommendedSettings?.video_style ?? videoSettings.video_style,
      formTarget: target,
      category: inferProductCategory(
        productName.trim() || analysis.productName,
        description.trim() || analysis.summary,
        analysis
      ),
      productName: productName.trim() || analysis.productName,
      description: description.trim() || analysis.summary,
    });
  }, [
    analysis,
    recommendedSettings,
    videoSettings.video_style,
    target,
    productName,
    description,
  ]);

  const videoIdeas = useMemo(() => {
    if (!analysis) return [];
    const analysisResult = buildAnalysisResult({
      analysis,
      formTarget: target,
    });
    return generateVideoIdeas(
      {
        productName: productName.trim() || analysis.productName,
        category: inferProductCategory(
          productName.trim() || analysis.productName,
          description.trim() || analysis.summary,
          analysis
        ),
        sellingPoints: analysis.sellingPoints,
        targetAudience: analysisResult.targetAudience,
        description: description.trim() || analysis.summary,
        analysis,
        analysisResult,
      },
      {
        duration:
          videoSettings.duration_sec >= 30 ? videoSettings.duration_sec : 30,
      }
    );
    // planBrief / video_style は依存しない（選択で再生成ループを防ぐ）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, productName, description, target, videoSettings.duration_sec]);

  // 分析完了後、未選択なら先頭案を自動選択
  useEffect(() => {
    if (!analysis || videoIdeas.length === 0) {
      setSelectedVideoIdea(null);
      return;
    }
    const current = selectedVideoIdea;
    if (current && videoIdeas.some((i) => i.id === current.id)) return;

    const first = videoIdeas[0];
    if (!first) return;
    applyVideoIdea(first);
    // applyVideoIdea は安定参照ではないが、ideas 変化時のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, videoIdeas]);

  const applyVideoIdea = (idea: VideoIdea) => {
    setSelectedVideoIdea(idea);
    preferredTemplateRef.current = null;
    const style =
      normalizeVideoStyleId(idea.videoStyle) ??
      (idea.videoStyle as VideoStyleId);
    setVideoSettings((prev) => ({
      ...prev,
      video_style: style,
    }));
    setPlanBrief((prev) => ({
      ...prev,
      target: idea.targetAudience || prev.target,
      firstThreeSeconds: idea.hook,
      cta: idea.cta,
      reason: idea.reason,
      structure: idea.timeline
        .map((t) => `${t.second}秒: ${t.scene} — ${t.text}`)
        .join("\n"),
    }));
    setCreativeDraft((prev) => ({
      ...prev,
      target: idea.targetAudience || prev.target,
      hook: idea.hook,
      cta: idea.cta,
    }));
  };

  const syncFromPlanBrief = (next: AiPlanBrief) => {
    setPlanBrief(next);
    const creative = planBriefToCreativePayload(next);
    setCreativeDraft({
      target: creative.target,
      hook: creative.hook,
      script: creative.script,
      cta: creative.cta,
      hashtags: creative.hashtags || next.hashtags,
    });
    setPostPrep(
      buildPostPrepSet({
        brief: next,
        analysis,
        productName: productName.trim() || analysis?.productName,
      })
    );
  };

  const resetDownstream = () => {
    setHooks([]);
    setVideo("");
    setSelectedTemplate(null);
    setCreativeDraft(emptyCreativeDraft());
    setPlanBrief(emptyAiPlanBrief());
    setPostPrep(emptyPostPrepSet());
    setPlanVariant("ugc");
    setSelectedVideoIdea(null);
    setRecommendedSettings(null);
    setVideoSettings({
      ...DEFAULT_VIDEO_SETTINGS,
      video_style:
        preferredTemplateRef.current ?? DEFAULT_VIDEO_SETTINGS.video_style,
    });
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
    setImageBlob(null);
    setImagePromptUsed("");
    setAiVideoUrl(null);
    setAiVideoFilename(null);
    setSalesVideoUrl(null);
    setSalesVideoScore(null);
    setSalesVideoHook(null);
    setSalesVideoAngle(null);
    setSalesVideoError(null);
    setSalesVideoSteps(EMPTY_SALES_VIDEO_STEPS);
    setSalesVideoProgressIndex(0);
    setGenerationStatus("idle");
  };

  const applyPerformanceToForm = (
    performance: ProductPerformanceRecord | null
  ) => {
    setPerfViews(String(performance?.views ?? 0));
    setPerfLikes(String(performance?.likes ?? 0));
    setPerfComments(String(performance?.comments ?? 0));
    setPerfClicks(String(performance?.clicks ?? 0));
    setPerfSales(String(performance?.sales ?? 0));
    setPerfRevenue(String(performance?.revenue ?? 0));
    setPerfNotes(performance?.notes ?? "");
  };

  const loadPerformance = async (productId: string) => {
    setPerfHint(null);
    try {
      const res = await fetch(`/api/products/${productId}/performance`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "成果データの取得に失敗しました"
        );
      }
      applyPerformanceToForm(
        (data.performance as ProductPerformanceRecord | null) ?? null
      );
    } catch (err) {
      applyPerformanceToForm(null);
      setPerfHint(err instanceof Error ? err.message : String(err));
    }
  };

  const savePerformance = async () => {
    if (!selectedProductId || busy) return;

    setError(null);
    setPerfHint(null);
    setPerfLoading(true);

    try {
      const res = await fetch(
        `/api/products/${selectedProductId}/performance`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            views: Number(perfViews) || 0,
            likes: Number(perfLikes) || 0,
            comments: Number(perfComments) || 0,
            clicks: Number(perfClicks) || 0,
            sales: Number(perfSales) || 0,
            revenue: Number(perfRevenue) || 0,
            notes: perfNotes.trim() || null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "成果の保存に失敗しました"
        );
      }

      if (data.adjusted_score?.score && analysis) {
        applyAnalysisResult(
          {
            ...analysis,
            salesScore: data.adjusted_score.score,
          },
          { keepCreative: true }
        );
      }

      const bonus = data.adjusted_score?.meta?.performance_bonus;
      setPerfHint(
        typeof bonus === "number" && bonus > 0
          ? `成果を保存しました（販売スコアに +${bonus} 反映）`
          : "成果を保存しました"
      );

      await refreshDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPerfLoading(false);
    }
  };

  const applyAnalysisResult = (
    next: ProductAnalysis,
    options?: { keepCreative?: boolean }
  ) => {
    setAnalysis(next);
    if (!options?.keepCreative) {
      const draft = buildCreativeDraft({
        analysis: next,
        formTarget: target,
        platform,
      });
      setCreativeDraft(draft);
      const brief = buildAiPlanBrief({
        analysis: next,
        formTarget: target,
        platform,
      });
      setPlanBrief(brief);
      setPostPrep(
        buildPostPrepSet({
          brief,
          analysis: next,
          productName: productName.trim() || next.productName,
        })
      );
      setPlanVariant("ugc");
      const recommended = recommendVideoSettings({
        analysis: next,
        platform,
      });
      setRecommendedSettings(recommended);
      // 分析直後はおすすめを自動反映（?template= 指定がある場合はスタイルを維持）
      setVideoSettings({
        video_style:
          preferredTemplateRef.current ?? recommended.video_style,
        duration_sec: recommended.duration_sec,
        speaker: recommended.speaker,
        captions_enabled: recommended.captions_enabled,
        bgm: recommended.bgm,
      });
    }
  };

  const markInputDirty = () => {
    setAnalysis(null);
    setSelectedProductId(null);
    setSaveHint(null);
    setPerfHint(null);
    applyPerformanceToForm(null);
    resetDownstream();
  };

  const formatHistoryDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const openProductHistory = async (id: string) => {
    if (busy) return;

    setError(null);
    setSaveHint(null);
    setHistoryLoading(true);
    resetDownstream();

    try {
      // まず analyze 用ローダー（discovery / 未分析商品も可）
      const analyzeRes = await fetch(`/api/analyze/products/${id}`);
      const analyzeData = await analyzeRes.json();

      if (analyzeRes.ok && analyzeData?.product) {
        const product = analyzeData.product as {
          id: string;
          product_name: string;
          description: string;
          target: string;
          platform: string;
          product_url: string | null;
          image_url: string | null;
          analysis: ProductAnalysis | null;
        };

        setProductName(product.product_name);
        setDescription(product.description || "");
        setTarget(product.target || "");
        setPlatform(product.platform || PLATFORMS[0]);
        setProductUrl(product.product_url || "");
        setSelectedProductId(product.id);

        if (productImagePreview?.startsWith("blob:")) {
          URL.revokeObjectURL(productImagePreview);
        }
        setProductImage(null);
        setProductImagePreview(product.image_url);

        if (product.analysis) {
          applyAnalysisResult(product.analysis);
          await loadPerformance(product.id);
          document
            .getElementById("analysis-result")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          setAnalysis(null);
          setCreativeDraft(emptyCreativeDraft());
          setPlanBrief(emptyAiPlanBrief());
          setPostPrep(emptyPostPrepSet());
          setUrlHint(
            "商品をDBから読み込みました。内容を確認してAI分析を実行してください。"
          );
          document
            .getElementById("analyze-form")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      // フォールバック: 既存 analysis API
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof analyzeData?.error === "string"
            ? analyzeData.error
            : typeof data?.error === "string"
              ? data.error
              : "商品の読み込みに失敗しました"
        );
      }

      const product = data.product;
      const nextAnalysis = data.analysis as ProductAnalysis;

      if (!nextAnalysis) {
        throw new Error("分析JSONが見つかりません");
      }

      setProductName(String(product?.product_name ?? nextAnalysis.productName));
      setDescription(String(product?.description ?? ""));
      setTarget(String(product?.target ?? ""));
      setPlatform(String(product?.platform || PLATFORMS[0]));
      setProductUrl(
        String(product?.product_url ?? nextAnalysis.productUrl ?? "")
      );
      setSelectedProductId(String(product?.id ?? id));
      applyAnalysisResult(nextAnalysis);
      await loadPerformance(String(product?.id ?? id));

      if (productImagePreview) URL.revokeObjectURL(productImagePreview);
      setProductImage(null);
      setProductImagePreview(null);

      document
        .getElementById("analysis-result")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (productQueryHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const productId =
      params.get("id")?.trim() || params.get("product")?.trim();
    const urlParam = params.get("url")?.trim();
    const imageParam = params.get("image")?.trim();
    const templateParam = params.get("template")?.trim();
    const templateKey = resolveSampleTemplateKey(templateParam);

    if (!productId && !urlParam && !imageParam && !templateParam) return;
    productQueryHandled.current = true;

    // クエリは消費したらパスだけ残す（/analyze）
    window.history.replaceState({}, "", "/analyze");

    if (templateKey) {
      preferredTemplateRef.current = templateKey;
      setVideoSettings((prev) => ({
        ...prev,
        video_style: templateKey,
      }));
      setUrlHint(
        `テンプレート「${getVideoStyleLabel(templateKey)}」を選択しました。商品情報を入力して分析・動画作成へ進めます。`
      );
      document
        .getElementById("analyze-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (templateParam) {
      setUrlHint(
        `テンプレート「${templateParam}」は未対応です。動画設定からスタイルを選んでください。`
      );
    }

    if (urlParam) {
      if (isValidHttpUrl(urlParam)) {
        setProductUrl(urlParam);
        setUrlError(null);
        setUrlHint(
          (prev) =>
            prev ??
            "TOPから商品URLを受け取りました。必要なら商品名・説明を補って分析してください。"
        );
        markInputDirty();
        console.log("[analyze] query url hydrated:", urlParam);
        document
          .getElementById("analyze-form")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setUrlError("有効なURLを入力してください");
        setUrlHint(null);
      }
    }

    if (imageParam) {
      // 公開画像URLをプレビューとしてセット（アップロード相当）
      if (productImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(productImagePreview);
      }
      setProductImage(null);
      setProductImagePreview(imageParam);
      setUrlHint(
        (prev) =>
          prev ??
          "TOPから商品画像を受け取りました。商品情報を入力して分析・動画作成へ進めます。"
      );
      markInputDirty();
      document
        .getElementById("analyze-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (productId) {
      void openProductHistory(productId);
    }
  }, []);

  const onProductImageChange = (file: File | null) => {
    if (productImagePreview) URL.revokeObjectURL(productImagePreview);

    if (!file) {
      setProductImage(null);
      setProductImagePreview(null);
      markInputDirty();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("画像ファイル（PNG / JPG / WEBP など）を選択してください");
      return;
    }

    setError(null);
    setProductImage(file);
    setProductImagePreview(URL.createObjectURL(file));
    markInputDirty();
  };

  const applyProductUrl = async () => {
    if (urlLoading) return;

    const url = productUrl.trim();
    if (!url) {
      setUrlError("URLを入力してください");
      setUrlHint(null);
      return;
    }
    if (!isValidHttpUrl(url)) {
      setUrlError("有効なURLを入力してください");
      setUrlHint(null);
      return;
    }

    setError(null);
    setUrlError(null);
    setUrlHint(null);
    setUrlLoading(true);

    try {
      const remote = await fetchProductFromUrl(url);

      if (remote) {
        if (remote.productName) setProductName(remote.productName);
        if (remote.description) setDescription(remote.description);
        if (remote.target) setTarget(remote.target);
        setUrlHint("商品URLから情報を取得しました");
        markInputDirty();
      } else {
        setUrlHint(
          "URLを保存しました。商品ページ解析APIは未接続のため、商品名・説明は手動入力してください。"
        );
      }
    } catch (err) {
      setUrlError(
        err instanceof Error ? err.message : "有効なURLを入力してください"
      );
    } finally {
      setUrlLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!canAnalyze) return;

    setError(null);
    setSaveHint(null);
    setAnalyzeLoading(true);
    setSelectedProductId(null);
    resetDownstream();

    try {
      const res = await fetch("/api/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName.trim(),
          description: description.trim(),
          target: target.trim(),
          platform: platform.trim(),
          product_url: productUrl.trim() || null,
          image_name: productImage?.name ?? null,
          // 将来: TikTok商品IDを渡す
          tiktok_product_id: null,
          source: productUrl.trim() ? "product_url" : "manual",
        }),
      });

      const data = (await res.json()) as AnalyzeProductResponse & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "商品分析に失敗しました"
        );
      }

      if (!data.analysis) {
        throw new Error("分析結果が返りませんでした");
      }

      setAnalysis(data.analysis);
      setCreativeDraft(
        buildCreativeDraft({
          analysis: data.analysis,
          formTarget: target,
          platform,
        })
      );
      const brief = buildAiPlanBrief({
        analysis: data.analysis,
        formTarget: target,
        platform,
      });
      setPlanBrief(brief);
      setPostPrep(
        buildPostPrepSet({
          brief,
          analysis: data.analysis,
          productName: productName.trim() || data.analysis.productName,
        })
      );
      setPlanVariant("ugc");
      const recommended = recommendVideoSettings({
        analysis: data.analysis,
        platform,
      });
      setRecommendedSettings(recommended);
      setVideoSettings({
        video_style:
          preferredTemplateRef.current ?? recommended.video_style,
        duration_sec: recommended.duration_sec,
        speaker: recommended.speaker,
        captions_enabled: recommended.captions_enabled,
        bgm: recommended.bgm,
      });
      setSelectedProductId(data.product_id ?? null);

      if (data.product_id) {
        await loadPerformance(data.product_id);
      } else {
        applyPerformanceToForm(null);
      }

      if (data.save_warning) {
        setSaveHint(
          `分析は完了しましたが履歴保存に失敗: ${data.save_warning}`
        );
      } else if (data.product_id) {
        setSaveHint("分析結果を履歴に保存しました");
      }

      await refreshDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const buildImagePrompt = (current: ProductAnalysis) => {
    const hookLines = hooks
      .map(
        (item, index) =>
          `${index + 1}. [${item.type}] ${item.hook} — ${item.reason}`
      )
      .join("\n");

    return [
      `商品: ${current.productName}`,
      `ターゲット: ${target}`,
      `プラットフォーム: ${platform}`,
      current.productUrl ? `商品URL: ${current.productUrl}` : "",
      `販売スコア: ${current.salesScore.total}/100 (${current.salesScore.grade})`,
      "",
      "【AI商品分析】",
      current.summary,
      `購入者ペルソナ: ${current.buyerPersona}`,
      `販売アングル: ${current.salesAngle}`,
      `オファースタイル: ${current.offerStyle}`,
      `CTA: ${current.cta}`,
      current.hasImage
        ? `参考商品画像ファイル: ${current.imageName}`
        : "参考商品画像: なし",
      "",
      "購入理由:",
      ...current.purchaseReasons.map((item, index) => `${index + 1}. ${item}`),
      "",
      "差別化ポイント:",
      ...current.differentiation.map((item, index) => `${index + 1}. ${item}`),
      "",
      "推奨動画構成:",
      ...current.recommendedVideoStructure.map(
        (item, index) => `${index + 1}. ${item}`
      ),
      "",
      "売れるポイント:",
      ...current.sellingPoints.map((item, index) => `${index + 1}. ${item}`),
      "",
      "動画フック:",
      hookLines || "(なし)",
      "",
      "動画企画:",
      video || "(なし)",
      "",
      "上記の販売企画の冒頭シーンを表す、高品質な縦型SNS販売ビジュアル。",
      "実物感があり、誇張しすぎない、テキストなし、シネマティックな照明。",
    ]
      .filter((line) => line !== "")
      .join("\n");
  };

  const generatePlan = async () => {
    if (!analysis || !canSubmitPlan) return;

    setError(null);
    setPlanLoading(true);
    setHooks([]);
    setVideo("");
    setSelectedTemplate(null);

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
    setImagePromptUsed("");
    setImageBlob(null);
    setAiVideoUrl(null);
    setAiVideoFilename(null);

    const category = inferProductCategory(
      analysis.productName,
      description,
      analysis
    );

    const templateSelection = selectVideoTemplate({
      salesAngle: analysis.salesAngle,
      category,
      target,
      productName: analysis.productName,
      description,
      offerStyle: analysis.offerStyle,
    });
    setSelectedTemplate(templateSelection);

    const baseProductName = buildApiProductName(analysis, description);
    const baseTarget = buildApiTarget(analysis, target);
    const platformValue = platform.trim();

    // 既存API契約は維持（product_name / target / platform）
    const hookBody = {
      product_name: baseProductName,
      target: baseTarget,
      platform: platformValue,
    };

    // generate-video のみテンプレート情報を product_name 文字列へ追記
    const videoBody = {
      product_name: appendTemplateToProductName(
        baseProductName,
        templateSelection
      ),
      target: baseTarget,
      platform: platformValue,
    };

    try {
      const [hookRes, videoRes] = await Promise.all([
        fetch("/api/generate-hook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hookBody),
        }),
        fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(videoBody),
        }),
      ]);

      const hookData = await hookRes.json();
      const videoData = await videoRes.json();

      if (!hookRes.ok) {
        throw new Error(
          typeof hookData?.error === "string"
            ? hookData.error
            : "フック生成に失敗しました"
        );
      }

      if (!videoRes.ok) {
        throw new Error(
          typeof videoData?.error === "string"
            ? videoData.error
            : "動画企画生成に失敗しました"
        );
      }

      const nextHooks: HookItem[] = Array.isArray(hookData?.hooks)
        ? hookData.hooks.map(
            (item: Partial<HookItem>): HookItem => ({
              hook: String(item?.hook ?? ""),
              type: String(item?.type ?? ""),
              reason: String(item?.reason ?? ""),
            })
          )
        : [];

      setHooks(nextHooks);
      setVideo(typeof videoData?.video === "string" ? videoData.video : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPlanLoading(false);
    }
  };

  const createImage = async () => {
    if (!analysis || !canCreateImage) return;

    setError(null);
    setImageLoading(true);
    setAiVideoUrl(null);
    setAiVideoFilename(null);

    const prompt = buildImagePrompt(analysis);
    setImagePromptUsed(prompt);

    try {
      const res = await fetch("/api/create-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const data = await res.json();
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "画像生成に失敗しました"
          );
        }
        throw new Error("画像生成に失敗しました");
      }

      if (!contentType.includes("image/")) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "画像データが返りませんでした"
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(url);
      setImageBlob(blob);
      setAiVideoSource("generated");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImageLoading(false);
    }
  };

  const createAiVideo = async () => {
    if (!canCreateAiVideo) return;

    setError(null);
    setAiVideoLoading(true);
    setAiVideoUrl(null);
    setAiVideoFilename(null);

    try {
      let sourceBlob: Blob | null = null;

      if (aiVideoSource === "upload") {
        if (!productImage) {
          throw new Error("アップロードした商品画像を選択してください");
        }
        sourceBlob = productImage;
      } else if (imageBlob) {
        sourceBlob = imageBlob;
      } else if (imageUrl) {
        const fetched = await fetch(imageUrl);
        sourceBlob = await fetched.blob();
      }

      if (!sourceBlob) {
        throw new Error("動画生成用の商品画像がありません");
      }

      const imageBase64 = await blobToBase64(sourceBlob);

      const res = await fetch("/api/create-ai-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: imageBase64,
          motion: selectedMotion,
          product_name: productName.trim() || analysis?.productName || "",
          duration_sec: 15,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "AI動画生成に失敗しました"
        );
      }

      if (typeof data.video_url !== "string") {
        throw new Error("動画URLが返りませんでした");
      }

      setAiVideoUrl(data.video_url);
      setAiVideoFilename(
        typeof data.filename === "string" ? data.filename : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiVideoLoading(false);
    }
  };

  const createSalesVideo = async () => {
    if (!analysis || !canCreateSalesVideo) return;

    setSalesVideoError(null);
    setEnginePrepMessage(null);
    setError(null);

    // 課金ゲート: Free / 上限超過 → /pricing。有料枠内はエンジン接続準備中（動画API未接続）
    try {
      const usageRes = await fetch("/api/usage");
      const usageData = await usageRes.json();
      const plan = String(usageData?.plan ?? "free").toLowerCase();
      const remaining = Number(usageData?.remaining ?? 0);
      const authenticated = Boolean(usageData?.authenticated);

      if (!authenticated) {
        router.push("/login?next=/pricing");
        return;
      }
      if (plan === "free" || remaining <= 0) {
        router.push("/pricing");
        return;
      }

      setEnginePrepMessage(
        "動画生成機能の準備が完了しました。現在動画生成エンジンを接続中です。"
      );
      setUsageRefreshToken((n) => n + 1);
    } catch (gateErr) {
      setSalesVideoError(
        gateErr instanceof Error
          ? gateErr.message
          : "利用状況の確認に失敗しました"
      );
    }
  };

  useEffect(() => {
    if (!salesVideoLoading && !salesVideoUrl) return;
    const id = salesVideoUrl ? "video-complete" : "generate-video";
    window.setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [salesVideoLoading, salesVideoUrl]);

  const workspaceStep = resolveAnalyzeStep({
    hasAnalysis: Boolean(analysis),
    isGenerating: salesVideoLoading,
    hasVideo: Boolean(salesVideoUrl),
  });
  const generatePhase = resolveGeneratePhase({
    isGenerating: salesVideoLoading,
    hasVideo: Boolean(salesVideoUrl),
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            ZENOVA Workspace
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            商品を入れるだけで、投稿準備まで完結
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            商品分析 → 動画企画 → AI生成 → 投稿準備の一本道
          </p>
          <div className="mt-6">
            <AnalyzeStepBar current={workspaceStep} />
          </div>
          <div className="mt-4">
            <UsageMeterBanner refreshToken={usageRefreshToken} />
          </div>
        </header>

        {/* STEP 1: URL */}
        <section
          id="analyze-form"
          className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
              1
            </span>
            <h2 className="text-lg font-semibold">商品分析</h2>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            商品URL・画像・説明のいずれかを入力して、AI分析を開始してください
          </p>
          <div className="mt-6 space-y-4">
          <div>
            <label
              className="mb-2 block text-sm text-gray-400"
              htmlFor="product-url"
            >
              商品URL
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                id="product-url"
                type="url"
                value={productUrl}
                onChange={(e) => {
                  setProductUrl(e.target.value);
                  setUrlHint(null);
                  setUrlError(null);
                  markInputDirty();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void applyProductUrl();
                  }
                }}
                placeholder="https://... （TikTok商品データ接続準備済み）"
                disabled={urlLoading}
                aria-invalid={Boolean(urlError)}
                className={`${inputClassName} min-w-0`}
              />
              <button
                type="button"
                onClick={() => void applyProductUrl()}
                disabled={urlLoading}
                className="shrink-0 rounded bg-zinc-100 px-4 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {urlLoading ? "確認中..." : "URLを適用"}
              </button>
            </div>
            {urlError && (
              <p className="mt-2 text-sm text-red-300" role="alert">
                {urlError}
              </p>
            )}
            {urlHint && !urlError && (
              <p className="mt-2 text-xs text-gray-500">{urlHint}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400" htmlFor="product">
              商品名
            </label>
            <input
              id="product"
              type="text"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                markInputDirty();
              }}
              placeholder="例: ワイヤレスイヤホン Pro"
              disabled={busy}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm text-gray-400"
              htmlFor="description"
            >
              商品説明
            </label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markInputDirty();
              }}
              placeholder="特徴、効果、価格帯、他社との違い、レビュー要点などを記入"
              disabled={busy}
              className={`${inputClassName} resize-y`}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm text-gray-400"
              htmlFor="product-image"
            >
              商品画像アップロード
            </label>
            <input
              id="product-image"
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) =>
                onProductImageChange(e.target.files?.[0] ?? null)
              }
              className="block w-full text-sm text-gray-400 file:mr-4 file:rounded file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black disabled:opacity-50"
            />
            {productImagePreview && (
              <div className="mt-3 rounded border border-zinc-800 bg-zinc-900 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImagePreview}
                  alt="アップロードした商品画像"
                  className="max-h-48 rounded object-contain"
                />
                <p className="mt-2 text-xs text-gray-500">
                  {productImage?.name}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onProductImageChange(null)}
                  className="mt-2 text-xs text-gray-400 underline disabled:opacity-50"
                >
                  画像を削除
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400" htmlFor="target">
              ターゲット
            </label>
            <input
              id="target"
              type="text"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                markInputDirty();
              }}
              placeholder="例: 通勤中の20代会社員"
              disabled={busy}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm text-gray-400"
              htmlFor="platform"
            >
              プラットフォーム
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                markInputDirty();
              }}
              disabled={busy}
              className={inputClassName}
            >
              {PLATFORMS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

            <button
              type="button"
              onClick={runAnalysis}
              disabled={!canAnalyze}
              className="mt-2 w-full rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzeLoading ? "AI分析中..." : "AIで商品を分析する"}
            </button>
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {saveHint && (
          <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-gray-300">
            {saveHint}
          </div>
        )}

        {analysis && (
          <section id="analysis-result" className="mt-6 scroll-mt-24 space-y-4">
            {/* STEP 2: 動画企画 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                  2
                </span>
                <h2 className="text-lg font-semibold">動画企画</h2>
                {selectedProductId && (
                  <span className="ml-auto text-xs text-gray-500">
                    履歴 ID: {selectedProductId.slice(0, 8)}…
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-200">
                {analysis.summary}
              </p>

              {analysis.productUrl && (
                <p className="mt-3 break-all text-xs text-gray-500">
                  商品URL: {analysis.productUrl}
                </p>
              )}

              {analysisInsight && (
                <AnalysisInsightPanel insight={analysisInsight} />
              )}

              <VideoIdeaCards
                ideas={videoIdeas}
                selectedId={selectedVideoIdea?.id ?? null}
                disabled={busy}
                onSelect={applyVideoIdea}
              />

              <div className="mt-5">
                <SalesScorePanel analysis={analysis} />
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <p>
                  <span className="text-gray-300">販売アングル:</span>{" "}
                  {analysis.salesAngle}
                </p>
              </div>

              <AnalysisNarrative text={analysisNarrative} />

              <VideoStructurePreview
                brief={planBrief}
                settings={videoSettings}
              />

              <ReferenceVideoCards />

              <PlanVariantTabs
                active={planVariant}
                disabled={busy}
                onChange={(id) => {
                  setPlanVariant(id);
                  const bundle = planVariants.find((v) => v.id === id);
                  if (!bundle) return;
                  syncFromPlanBrief(bundle.brief);
                  preferredTemplateRef.current = null;
                  setVideoSettings((prev) => ({
                    ...prev,
                    video_style: bundle.style,
                  }));
                }}
              />

              <AiPlanBriefPanel
                brief={planBrief}
                onChange={syncFromPlanBrief}
                disabled={busy}
              />

              <PlanQualityPanel
                quality={planQuality}
                disabled={busy}
                onImprove={() => {
                  const improved = applyPlanBriefImprovements(
                    planBrief,
                    planQuality
                  );
                  syncFromPlanBrief(improved);
                }}
              />

              <PostPrepPanel
                prep={postPrep}
                disabled={busy}
                onChange={(next) => {
                  setPostPrep(next);
                  // ハッシュタグは企画書・生成 payload にも反映
                  setPlanBrief((prev) => ({
                    ...prev,
                    hashtags: next.hashtags,
                  }));
                  setCreativeDraft((prev) => ({
                    ...prev,
                    hashtags: next.hashtags,
                  }));
                }}
              />

              <details className="mt-5 rounded-xl border border-zinc-800 bg-black/30 p-4">
                <summary className="cursor-pointer text-sm text-gray-300">
                  詳細分析（ペルソナ・構成案など）
                </summary>
                <div className="mt-4 space-y-4">
                  {selectedProductId && (
                    <div className="rounded border border-zinc-800 bg-black/40 p-4">
                      <h3 className="text-sm font-medium text-gray-300">
                        動画パフォーマンス入力
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        公開後の成果を記録すると、販売スコアに実績が反映されます
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {(
                          [
                            ["閲覧数", perfViews, setPerfViews],
                            ["いいね", perfLikes, setPerfLikes],
                            ["コメント", perfComments, setPerfComments],
                            ["クリック", perfClicks, setPerfClicks],
                            ["成約数", perfSales, setPerfSales],
                            ["売上", perfRevenue, setPerfRevenue],
                          ] as const
                        ).map(([label, value, setter]) => (
                          <div key={label}>
                            <label className="mb-1 block text-xs text-gray-500">
                              {label}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={value}
                              onChange={(e) => setter(e.target.value)}
                              disabled={busy}
                              className={inputClassName}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="mt-3">
                        <label className="mb-1 block text-xs text-gray-500">
                          メモ
                        </label>
                        <textarea
                          rows={2}
                          value={perfNotes}
                          onChange={(e) => setPerfNotes(e.target.value)}
                          disabled={busy}
                          placeholder="例: フックAが伸びた / CTAをプロフ誘導に変更"
                          className={`${inputClassName} resize-y`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void savePerformance()}
                        disabled={busy}
                        className="mt-4 rounded bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {perfLoading ? "保存中..." : "成果を保存してスコア反映"}
                      </button>

                      {perfHint && (
                        <p className="mt-3 text-xs text-gray-400">{perfHint}</p>
                      )}
                    </div>
                  )}

                  <div className="rounded border border-zinc-800 bg-black/40 p-4">
                    <h3 className="text-sm font-medium text-gray-300">
                      購入者ペルソナ
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">
                      {analysis.buyerPersona}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <AnalysisList
                      title="売れるポイント"
                      items={analysis.sellingPoints}
                    />
                    <AnalysisList title="顧客の悩み" items={analysis.painPoints} />
                    <AnalysisList
                      title="購入理由"
                      items={analysis.purchaseReasons}
                    />
                    <AnalysisList
                      title="競合との差別化ポイント"
                      items={analysis.differentiation}
                    />
                    <AnalysisList
                      title="推奨動画構成"
                      items={analysis.recommendedVideoStructure}
                    />
                    <AnalysisList title="CTA案" items={analysis.ctaIdeas} />
                  </div>

                  <div className="space-y-2 text-sm text-gray-400">
                    <p>
                      <span className="text-gray-300">オファー:</span>{" "}
                      {analysis.offerStyle}
                    </p>
                    <p>
                      <span className="text-gray-300">TikTokデータ:</span>{" "}
                      {analysis.tiktok?.productId
                        ? `接続済み (${analysis.tiktok.productId})`
                        : "未接続（接続ポイント準備済み）"}
                    </p>
                  </div>

                  <details className="rounded border border-zinc-800 bg-black/30 p-4">
                    <summary className="cursor-pointer text-sm text-gray-300">
                      分析結果 JSON
                    </summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-gray-500">
                      {analysisJson}
                    </pre>
                  </details>
                </div>
              </details>
            </div>

            {/* STEP 3: 動画設定パネル */}
            <VideoSettingsPanel
              settings={videoSettings}
              onChange={(next) => {
                // ユーザーがスタイルを変更したら ?template= 優先を解除
                if (next.video_style !== videoSettings.video_style) {
                  preferredTemplateRef.current = null;
                }
                setVideoSettings(next);
              }}
              disabled={busy}
              recommendation={recommendedSettings}
            />

            {/* STEP 4: 動画生成開始 → 生成中 → 完成 → ダウンロード */}
            <div
              id="generate-video"
              className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                  3
                </span>
                <h2 className="text-lg font-semibold">
                  {generatePhase === "generating"
                    ? "AI生成中..."
                    : generatePhase === "complete"
                      ? "投稿準備へ"
                      : "AI生成"}
                </h2>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                {generatePhase === "generating"
                  ? "商品特徴の分析から映像生成まで進行中です。このままお待ちください"
                  : generatePhase === "complete"
                    ? "完成したら投稿準備画面で評価・コピーを確認できます"
                    : "企画とスタイルをもとに、AI動画を作成します"}
              </p>

              <GenerationPreview
                settings={videoSettings}
                phase={generatePhase}
                generationStatus={generationStatus}
                canGenerate={canCreateSalesVideo}
                disabled={busy}
                errorMessage={salesVideoError}
                prepMessage={enginePrepMessage}
                imageWarning={
                  !productImage &&
                  !productImagePreview &&
                  !imageBlob &&
                  !imageUrl
                    ? getPipelineErrorMessage("NO_IMAGE")
                    : null
                }
                onGenerate={() => {
                  document
                    .getElementById("generate-video")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  void createSalesVideo();
                }}
              />

              {(generatePhase === "complete" || salesVideoError) && (
                <div className="mt-6 rounded-xl border border-zinc-800 bg-black/40 p-4">
                  <h3 className="text-sm font-medium text-gray-300">
                    {generatePhase === "complete" ? "生成結果" : "生成進捗"}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {SALES_VIDEO_STEPS.map((step, index) => {
                      const done = salesVideoSteps[step.key];
                      const running =
                        salesVideoLoading &&
                        !done &&
                        index === salesVideoProgressIndex;
                      return (
                        <li
                          key={step.key}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-gray-300">{step.label}</span>
                          <span
                            className={
                              done
                                ? "text-emerald-400"
                                : running
                                  ? "text-amber-300"
                                  : "text-gray-600"
                            }
                          >
                            {done ? "完了" : running ? "進行中..." : "待機"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {salesVideoError && (
                    <p className="mt-4 text-sm text-red-300">
                      {salesVideoError}
                    </p>
                  )}
                </div>
              )}

              {generatePhase === "complete" && salesVideoUrl && (
                <div
                  id="video-complete"
                  className="mt-6 space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4"
                >
                  <p className="text-sm font-semibold text-emerald-200">
                    動画が完成しました
                  </p>
                  <Link
                    href="/preview"
                    className="inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-200"
                  >
                    動画プレビュー画面を開く
                  </Link>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    {salesVideoScore != null && (
                      <span className="rounded bg-zinc-900 px-2 py-1">
                        評価スコア {salesVideoScore}
                      </span>
                    )}
                    {salesVideoHook && (
                      <span className="rounded bg-zinc-900 px-2 py-1">
                        Hook: {salesVideoHook}
                      </span>
                    )}
                  </div>
                  {salesVideoAngle && (
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-300">販売アングル:</span>{" "}
                      {salesVideoAngle}
                    </p>
                  )}
                  <video
                    key={salesVideoUrl}
                    src={salesVideoUrl}
                    controls
                    playsInline
                    className="w-full max-w-md rounded border border-zinc-800 bg-black"
                  />
                  <button
                    type="button"
                    disabled={salesVideoDownloading}
                    onClick={() => {
                      void (async () => {
                        if (!salesVideoUrl) return;
                        setSalesVideoDownloading(true);
                        try {
                          const name = buildSalesVideoDownloadName(
                            productName.trim() ||
                              analysis?.productName ||
                              "product"
                          );
                          await downloadVideoFile(salesVideoUrl, name);
                        } catch (err) {
                          const message =
                            err instanceof Error ? err.message : String(err);
                          setSalesVideoError(message);
                          setError(message);
                        } finally {
                          setSalesVideoDownloading(false);
                        }
                      })();
                    }}
                    className="w-full rounded-xl bg-white px-5 py-4 text-base font-semibold text-black hover:bg-gray-100 disabled:opacity-40"
                  >
                    {salesVideoDownloading
                      ? "ダウンロード中..."
                      : "ダウンロード"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void createSalesVideo()}
                    disabled={!canCreateSalesVideo}
                    className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm text-gray-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    もう一度生成する
                  </button>
                </div>
              )}

              {generatePhase === "ready" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={generatePlan}
                    disabled={!canSubmitPlan}
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-gray-200 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    {planLoading ? "企画生成中..." : "動画企画だけ作る"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void createAiVideo()}
                    disabled={!canCreateAiVideo}
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-gray-200 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    {aiVideoLoading ? "短尺生成中..." : "スタイル動画（15秒）"}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <details className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <summary className="cursor-pointer text-sm text-gray-300">
            追加オプション（企画・画像生成・詳細フロー）
          </summary>
          <div className="mt-4 space-y-6">
            {(hooks.length > 0 || video) && (
              <section className="space-y-6">
                {selectedTemplate && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <h2 className="text-lg font-semibold">選択テンプレート</h2>
                    <p className="mt-2 text-sm text-gray-300">
                      {selectedTemplate.template.nameJa}（
                      {selectedTemplate.template.name}）
                    </p>
                    <p className="mt-2 text-sm text-gray-400">
                      {selectedTemplate.template.description}
                    </p>
                    <ul className="mt-3 space-y-1 text-xs text-gray-500">
                      {selectedTemplate.reasons.map((reason) => (
                        <li key={reason}>・{reason}</li>
                      ))}
                    </ul>
                    <ol className="mt-4 space-y-2 text-sm text-gray-400">
                      {selectedTemplate.template.beats.map((beat) => (
                        <li key={`${beat.timing}-${beat.title}`}>
                          <span className="text-gray-300">
                            {beat.timing}s {beat.title}:
                          </span>{" "}
                          {beat.direction}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {hooks.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <h2 className="text-lg font-semibold">Hooks</h2>
                    <ul className="mt-4 space-y-4">
                      {hooks.map((item, index) => (
                        <li
                          key={`${item.hook}-${index}`}
                          className="rounded border border-zinc-800 bg-black/40 p-4"
                        >
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            {item.type || `Hook ${index + 1}`}
                          </p>
                          <p className="mt-2 text-base font-medium">{item.hook}</p>
                          {item.reason && (
                            <p className="mt-2 text-sm text-gray-400">
                              {item.reason}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {video && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <h2 className="text-lg font-semibold">Video</h2>
                    <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-200">
                      {video}
                    </pre>
                  </div>
                )}

                <button
                  type="button"
                  onClick={createImage}
                  disabled={!canCreateImage}
                  className="rounded-xl bg-white px-5 py-3 text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {imageLoading ? "画像生成中..." : "画像を作る"}
                </button>
              </section>
            )}

            {(imageLoading || imageUrl || imagePromptUsed) && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">生成画像</h2>

                {imageLoading && (
                  <p className="text-sm text-gray-400">画像を生成しています...</p>
                )}

                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="生成された販売ビジュアル"
                    className="max-h-[640px] w-full max-w-md rounded border border-zinc-800 object-contain"
                  />
                )}

                {imagePromptUsed && (
                  <details className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-gray-400">
                    <summary className="cursor-pointer text-gray-300">
                      使用した画像プロンプト
                    </summary>
                    <pre className="mt-3 whitespace-pre-wrap break-words font-sans">
                      {imagePromptUsed}
                    </pre>
                  </details>
                )}
              </section>
            )}

            {(imageUrl || productImage) && (
              <section className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                  <h2 className="text-lg font-semibold">AI動画生成（15秒）</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    商品画像と動き指定から、縦型15秒動画を生成して保存・プレビューします
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="mb-2 text-sm text-gray-400">入力画像</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!imageUrl || busy}
                          onClick={() => setAiVideoSource("generated")}
                          className={`rounded px-3 py-2 text-sm ${
                            aiVideoSource === "generated"
                              ? "bg-white text-black"
                              : "bg-zinc-800 text-gray-300"
                          } disabled:opacity-40`}
                        >
                          生成画像を使う
                        </button>
                        <button
                          type="button"
                          disabled={!productImage || busy}
                          onClick={() => setAiVideoSource("upload")}
                          className={`rounded px-3 py-2 text-sm ${
                            aiVideoSource === "upload"
                              ? "bg-white text-black"
                              : "bg-zinc-800 text-gray-300"
                          } disabled:opacity-40`}
                        >
                          アップロード商品画像を使う
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      動き指定は上の「動画スタイルを選ぶ」で設定できます
                    </p>

                    <button
                      type="button"
                      onClick={() => void createAiVideo()}
                      disabled={!canCreateAiVideo}
                      className="rounded-xl bg-white px-5 py-3 text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {aiVideoLoading
                        ? "15秒動画を生成中..."
                        : "AI動画を生成する（15秒）"}
                    </button>
                  </div>
                </div>

                {(aiVideoLoading || aiVideoUrl) && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <h3 className="text-base font-semibold">動画プレビュー</h3>
                    {aiVideoLoading && (
                      <p className="mt-3 text-sm text-gray-400">
                        画像から動画を生成しています。完了まで数十秒かかることがあります...
                      </p>
                    )}
                    {aiVideoUrl && (
                      <div className="mt-4 space-y-3">
                        <video
                          src={aiVideoUrl}
                          controls
                          playsInline
                          className="max-h-[640px] w-full max-w-md rounded border border-zinc-800 bg-black"
                        />
                        <div className="flex flex-wrap gap-3 text-sm">
                          <a
                            href={aiVideoUrl}
                            download={aiVideoFilename ?? "zenova-video.mp4"}
                            className="rounded bg-white px-4 py-2 font-medium text-black"
                          >
                            mp4をダウンロード
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </details>

        <p className="mt-10 text-center text-xs text-gray-600">
          <Link href="/products" className="underline hover:text-gray-400">
            売れてる商品を探す
          </Link>
          {" · "}
          <Link href="/history" className="underline hover:text-gray-400">
            生成動画履歴
          </Link>
          {" · "}
          <Link href="/pricing" className="underline hover:text-gray-400">
            料金プラン
          </Link>
        </p>
      </div>
    </main>
  );
}
