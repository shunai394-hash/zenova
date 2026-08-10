import { fetchTikTokProductSnapshot } from "./tiktok-source";
import type {
  AnalyzeProductRequest,
  ProductAnalysis,
  ProductDataSource,
  SalesScore,
  SalesScoreBreakdown,
  TikTokProductSnapshot,
} from "./types";

function splitSentences(text: string): string[] {
  return text
    .split(/[\n。！？.!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 6);
}

function uniqueStrings(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gradeFromTotal(total: number): SalesScore["grade"] {
  if (total >= 90) return "S";
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 50) return "C";
  return "D";
}

function labelFromGrade(grade: SalesScore["grade"]): string {
  switch (grade) {
    case "S":
      return "非常に売りやすい";
    case "A":
      return "売りやすい";
    case "B":
      return "標準的に売れる";
    case "C":
      return "訴求の磨き込みが必要";
    case "D":
      return "情報不足 / 再設計推奨";
  }
}

function computeSalesScore(input: {
  description: string;
  target: string;
  platform: string;
  productUrl: string;
  hasImage: boolean;
  sellingPoints: string[];
  differentiation: string[];
  tiktok: TikTokProductSnapshot | null;
}): SalesScore {
  const descLen = input.description.trim().length;
  const targetLen = input.target.trim().length;

  const clarity = clampScore(
    35 +
      Math.min(35, descLen / 8) +
      (targetLen > 4 ? 15 : 0) +
      (input.hasImage ? 10 : 0)
  );

  const demandFit = clampScore(
    40 +
      (input.platform === "TikTok" ? 20 : 10) +
      (targetLen > 8 ? 20 : 8) +
      (input.tiktok?.salesCount ? Math.min(20, input.tiktok.salesCount / 100) : 0)
  );

  const differentiation = clampScore(
    30 +
      input.differentiation.length * 12 +
      input.sellingPoints.length * 6 +
      (input.tiktok?.commissionRate ? 8 : 0)
  );

  const creativePotential = clampScore(
    45 +
      (input.hasImage ? 15 : 0) +
      (input.platform.includes("TikTok") || input.platform.includes("Shorts")
        ? 20
        : 10) +
      Math.min(15, input.sellingPoints.length * 4)
  );

  const conversionReadiness = clampScore(
    30 +
      (input.productUrl ? 25 : 0) +
      (targetLen > 4 ? 15 : 0) +
      (descLen > 40 ? 15 : 5) +
      (input.tiktok?.productId ? 15 : 0)
  );

  const breakdown: SalesScoreBreakdown = {
    clarity,
    demandFit,
    differentiation,
    creativePotential,
    conversionReadiness,
  };

  const total = clampScore(
    clarity * 0.2 +
      demandFit * 0.25 +
      differentiation * 0.2 +
      creativePotential * 0.2 +
      conversionReadiness * 0.15
  );

  const grade = gradeFromTotal(total);
  const tips: string[] = [];

  if (clarity < 70) tips.push("商品説明をもう少し具体的に（効果・使い方・違い）");
  if (!input.hasImage) tips.push("商品画像を追加すると実物感と信頼が上がる");
  if (!input.productUrl) tips.push("商品URLがあるとCTAと導線が明確になる");
  if (targetLen < 8) tips.push("ターゲットを場面付きで書く（例: 通勤中の20代）");
  if (differentiation < 65) tips.push("競合との違いを1つだけ強く打ち出す");
  if (!input.tiktok) tips.push("将来TikTok商品データを接続するとスコア精度が上がる");
  if (tips.length === 0) tips.push("このまま動画企画へ進めてOK");

  return {
    total,
    grade,
    label: labelFromGrade(grade),
    breakdown,
    tips: tips.slice(0, 4),
    baseTotal: total,
    baseBreakdown: { ...breakdown },
    performanceBonus: 0,
  };
}

function resolveSource(
  request: AnalyzeProductRequest,
  tiktok: TikTokProductSnapshot | null
): ProductDataSource {
  if (request.source) return request.source;
  if (tiktok?.productId) return "tiktok_shop";
  if (request.product_url?.trim()) return "product_url";
  return "manual";
}

export async function analyzeProduct(
  request: AnalyzeProductRequest
): Promise<ProductAnalysis> {
  const productName = String(request.product_name ?? "").trim();
  const description = String(request.description ?? "").trim();
  const target = String(request.target ?? "").trim();
  const platform = String(request.platform ?? "").trim();
  const productUrl = String(request.product_url ?? "").trim();
  const imageName = request.image_name?.trim() || null;

  if (!productName) throw new Error("product_name は必須です");
  if (!description) throw new Error("description は必須です");
  if (!target) throw new Error("target は必須です");
  if (!platform) throw new Error("platform は必須です");

  const tiktokLookupKey =
    request.tiktok_product_id?.trim() || productUrl || null;
  const tiktok = await fetchTikTokProductSnapshot(tiktokLookupKey);

  const sentences = splitSentences(description);

  const benefitKeywords = [
    "効果",
    "改善",
    "時短",
    "簡単",
    "便利",
    "節約",
    "快適",
    "人気",
    "レビュー",
    "口コミ",
    "限定",
    "公式",
    "保証",
    "送料",
    "コスパ",
    "防水",
    "軽量",
    "充電",
    "無線",
    "ワイヤレス",
  ];

  const painKeywords = [
    "悩み",
    "不便",
    "疲れ",
    "失敗",
    "高い",
    "面倒",
    "不安",
    "苦手",
    "時間がない",
    "続かない",
    "選び方",
    "わからない",
  ];

  const sellingFromKeywords = benefitKeywords
    .filter((keyword) => description.includes(keyword))
    .map((keyword) => `「${keyword}」を軸にした訴求が刺さりやすい`);

  const painFromKeywords = painKeywords
    .filter(
      (keyword) => description.includes(keyword) || target.includes(keyword)
    )
    .map((keyword) => `ターゲットの「${keyword}」に寄り添う導入が有効`);

  const sellingPoints = uniqueStrings(
    [
      ...sellingFromKeywords,
      ...sentences.slice(0, 3).map((sentence) => `強み: ${sentence}`),
      tiktok?.commissionRate
        ? `アフィリエイト報酬率の目安あり（約${tiktok.commissionRate}%）`
        : "",
      `${platform}では「実物の使用感」を先に見せると反応が取りやすい`,
      "誇張せず、具体的な変化・使い方・比較で信頼を作る",
    ].filter(Boolean),
    4
  );

  const painPoints = uniqueStrings(
    [
      ...painFromKeywords,
      `${target || "見込み客"}が抱える「今の不便」を冒頭で言語化する`,
      "スペック羅列より、日常シーンの困りごとから入る",
      "購入前の不安（品質・使い方・コスパ）を先回りして解消する",
    ],
    4
  );

  const salesAngle =
    platform === "TikTok"
      ? "冒頭1秒で商品を見せ、悩み→解決→証拠→CTAの短尺販売導線"
      : platform === "Instagram Reels"
        ? "世界観と使用シーンを重視し、保存・プロフィール誘導につながる販売導線"
        : "比較・解説寄りで納得感を作り、概要欄/コメント誘導につなげる販売導線";

  const offerStyle = imageName
    ? "アップロード画像を基準に、実物感のあるレビュー型オファー"
    : "商品説明ベースの問題解決型オファー";

  const cta =
    platform === "TikTok"
      ? "プロフィールのリンクから詳細をチェック"
      : platform === "Instagram Reels"
        ? "プロフィールのハイライト/リンクから詳細へ"
        : "概要欄のリンクから詳細を確認";

  const buyerPersona = target
    ? `${target}。情報収集は${platform}中心で、短尺動画から「自分ごと化」できた商品だけを比較検討する。価格より失敗回避と即効性を重視。`
    : `${platform}で商品を探す層。悩みが言語化されると保存・プロフィール遷移しやすい。`;

  const purchaseReasons = uniqueStrings(
    [
      ...sellingPoints.slice(0, 2).map((item) => item.replace(/^強み:\s*/, "")),
      "今の不便が動画の冒頭で自分ごと化されたから",
      "使い方が具体的で、購入後のイメージが湧いたから",
      "競合より「自分の生活シーン」に近いと感じたから",
      productUrl
        ? "リンク先で詳細・価格をすぐ確認できる安心感"
        : "導線が短く、次の行動が明確だから",
    ],
    4
  );

  const differentiation = uniqueStrings(
    [
      sentences[0]
        ? `説明文の独自性: ${sentences[0]}`
        : "具体的な使用シーンを先に見せ、スペック勝負を避ける",
      imageName
        ? "実物画像ベースのレビューで「広告っぽさ」を抑える"
        : "体験談・比較で信頼を作り、煽り表現を避ける",
      `${platform}向けに「最初の3秒の見せ方」を設計している点`,
      "購入理由を感情ではなく、日常の不便→解決で説明する点",
    ],
    4
  );

  const recommendedVideoStructure =
    platform === "TikTok"
      ? [
          "0–1秒: 商品または悩みを画面いっぱいに提示",
          "1–3秒: ターゲットの不便を一言で言語化",
          "3–8秒: 使用デモ / Before→After",
          "8–12秒: 差別化ポイントを1つだけ強調",
          "12–15秒: CTA（プロフィールリンク誘導）",
        ]
      : platform === "Instagram Reels"
        ? [
            "0–2秒: 世界観のある使用シーン",
            "2–6秒: 悩みと商品の出会い",
            "6–15秒: 使い方・質感のクローズアップ",
            "15–20秒: 差別化と保存したくなる要点",
            "最後: プロフィール / ハイライト誘導CTA",
          ]
        : [
            "0–3秒: 結論フック（誰向け・何が変わるか）",
            "3–10秒: 比較 or 解説で納得感",
            "10–20秒: 実演と注意点",
            "20–25秒: 差別化まとめ",
            "最後: 概要欄リンクCTA",
          ];

  const ctaIdeas = uniqueStrings(
    [
      cta,
      productUrl
        ? "概要/プロフィールの商品リンクから詳細を確認"
        : "プロフィールのリンクから詳細をチェック",
      "気になる人は保存して、あとで見比べてみて",
      "同じ悩みの人はコメントで教えて",
      platform === "TikTok"
        ? "今すぐプロフのリンクをタップ"
        : "詳細は概要欄のリンクへ",
    ],
    4
  );

  const summary = [
    `${productName}は、${target || "ターゲット顧客"}向けに${platform}で売る商品です。`,
    description
      ? `説明文から読み取れる価値は「${sentences[0] ?? description.slice(0, 40)}」。`
      : "説明文が短いため、使用シーンと変化を補って訴求する必要があります。",
    `${salesAngle}で組み立てるのが最適です。`,
  ].join("");

  const hasImage = Boolean(imageName);
  const salesScore = computeSalesScore({
    description,
    target,
    platform,
    productUrl,
    hasImage,
    sellingPoints,
    differentiation,
    tiktok,
  });

  const analysis: ProductAnalysis = {
    version: "1.0",
    analyzedAt: new Date().toISOString(),
    source: resolveSource(request, tiktok),
    productName,
    summary,
    sellingPoints,
    painPoints,
    targetInsight: target
      ? `${target}に対して、日常の不便を先に提示し「これなら解決できそう」と感じさせる`
      : "ターゲット未入力のため、年齢・場面・悩みを追加すると精度が上がります",
    salesAngle,
    offerStyle,
    cta,
    buyerPersona,
    purchaseReasons,
    differentiation,
    recommendedVideoStructure,
    ctaIdeas,
    productUrl: productUrl || null,
    hasImage,
    imageName,
    salesScore,
    tiktok,
  };

  return analysis;
}

/** 既存 generate-* API へ渡すための文字列化（契約は変更しない） */
export function buildApiProductName(
  analysis: ProductAnalysis,
  description: string
): string {
  return [
    analysis.productName,
    "",
    "【商品説明】",
    description.trim() || "(未入力)",
    analysis.productUrl ? `【商品URL】\n${analysis.productUrl}` : "",
    "",
    "【販売スコア】",
    `${analysis.salesScore.total}/100 (${analysis.salesScore.grade}) ${analysis.salesScore.label}`,
    "",
    "【AI商品分析】",
    analysis.summary,
    "",
    "購入者ペルソナ:",
    analysis.buyerPersona,
    "",
    "売れるポイント:",
    ...analysis.sellingPoints.map((item, index) => `${index + 1}. ${item}`),
    "",
    "購入理由:",
    ...analysis.purchaseReasons.map((item, index) => `${index + 1}. ${item}`),
    "",
    "顧客の悩み:",
    ...analysis.painPoints.map((item, index) => `${index + 1}. ${item}`),
    "",
    "競合との差別化:",
    ...analysis.differentiation.map((item, index) => `${index + 1}. ${item}`),
    "",
    "推奨動画構成:",
    ...analysis.recommendedVideoStructure.map(
      (item, index) => `${index + 1}. ${item}`
    ),
    "",
    `販売アングル: ${analysis.salesAngle}`,
    `オファースタイル: ${analysis.offerStyle}`,
    `推奨CTA: ${analysis.cta}`,
    "CTA案:",
    ...analysis.ctaIdeas.map((item, index) => `${index + 1}. ${item}`),
    analysis.hasImage
      ? `商品画像: あり（${analysis.imageName}）`
      : "商品画像: なし",
    analysis.tiktok?.productId
      ? `TikTok商品ID: ${analysis.tiktok.productId}`
      : "TikTok商品データ: 未接続",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildApiTarget(
  analysis: ProductAnalysis,
  target: string
): string {
  return [
    target.trim(),
    "",
    "【購入者ペルソナ】",
    analysis.buyerPersona,
    "",
    "【ターゲット洞察】",
    analysis.targetInsight,
    "",
    "刺さる切り口:",
    ...analysis.painPoints.slice(0, 2).map((item) => `- ${item}`),
    "",
    "購入理由:",
    ...analysis.purchaseReasons.slice(0, 2).map((item) => `- ${item}`),
  ].join("\n");
}
