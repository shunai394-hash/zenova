import { fetchTikTokProductSnapshot } from "./tiktok-source";
import type {
  AnalyzeProductRequest,
  BuyerPersonaDetail,
  ProductAnalysis,
  ProductDataSource,
  SalesScore,
  SalesScoreBreakdown,
  TikTokProductSnapshot,
} from "./types";

function uniqueStrings(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
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
      return "訴求設計の土台が強い（推定）";
    case "A":
      return "動画化しやすい（推定）";
    case "B":
      return "標準的な訴求余地（推定）";
    case "C":
      return "訴求の磨き込みが必要（推定）";
    case "D":
      return "情報不足 / 再設計推奨（推定）";
  }
}

/** 商品名・説明から特徴トークンを分解（存在しない性能は追加しない） */
export function extractProductFeatures(
  productName: string,
  description: string
): string[] {
  const blob = `${productName} ${description}`;
  const patterns: Array<{ re: RegExp; label: string }> = [
    { re: /ひんやり|涼感|冷却|クール/i, label: "ひんやり涼感" },
    { re: /UVカット|紫外線|UV対策|日焼け対策/i, label: "UVカット・日焼け対策" },
    { re: /薄手|薄い|軽量/i, label: "薄手" },
    { re: /ゆったり|ゆるめ|ワイド/i, label: "ゆったり設計" },
    { re: /指穴|指あき|フィンガー/i, label: "指穴付き" },
    { re: /夏用|夏向け|サマー/i, label: "夏向け" },
    { re: /アームカバー|腕カバー|腕用/i, label: "腕カバー" },
    { re: /レディース|女性用/i, label: "レディース向け" },
    { re: /防水|撥水/i, label: "防水・撥水" },
    { re: /充電|バッテリー|ワイヤレス|無線/i, label: "充電・ワイヤレス対応" },
    { re: /時短|簡単|ワンタッチ/i, label: "時短・簡単操作" },
    { re: /コンパクト|携帯|持ち運び/i, label: "携帯しやすい" },
    { re: /コスパ|お得|安い/i, label: "コスパ訴求" },
    { re: /公式|保証/i, label: "公式・保証あり" },
  ];

  const fromPatterns = patterns
    .filter((p) => p.re.test(blob))
    .map((p) => p.label);

  // スペース／句読点区切りの短いトークン（商品名特有語）
  const tokens = productName
    .split(/[\s　/／|｜,、・]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 10)
    .filter((t) => !/^(レディース|メンズ|男女|兼用|夏用|冬用)$/.test(t))
    // パターンで既に拾った語の重複・商品名ほぼそのままは除外
    .filter(
      (t) =>
        !fromPatterns.some(
          (p) => p.includes(t) || t.includes(p.replace(/・.*/, ""))
        )
    );

  return uniqueStrings([...fromPatterns, ...tokens], 10);
}

export function inferCategory(
  productName: string,
  description: string,
  features: string[]
): string {
  const blob = `${productName} ${description} ${features.join(" ")}`;
  if (/アームカバー|腕カバー|UV|日焼け|ファッション|服|靴下/i.test(blob)) {
    return "ファッション・日用品";
  }
  if (/美容|コスメ|スキン|メイク/i.test(blob)) return "美容";
  if (/ガジェット|イヤホン|充電|スマホ/i.test(blob)) return "ガジェット";
  if (/掃除|収納|キッチン|暮らし/i.test(blob)) return "暮らし";
  if (/食品|フード|飲料/i.test(blob)) return "食品";
  if (/健康|サプリ|ダイエット/i.test(blob)) return "健康";
  return "日用品";
}

function buildPersonaFromTarget(
  target: string,
  pain: string
): BuyerPersonaDetail {
  const t = target.trim() || "購入検討者";
  const ageMatch = t.match(/(\d{2})\s*代/) || t.match(/(\d{2})\s*歳/);
  const ageNum = ageMatch ? Number(ageMatch[1]) : null;
  const age =
    ageNum != null
      ? /\d{2}代/.test(t)
        ? `${ageNum + 4}歳前後（${ageNum}代）`
        : `${ageNum}歳`
      : "年齢は入力ターゲットに準拠";

  let occupation = "会社員";
  if (/主婦|主夫/.test(t)) occupation = "主婦・主夫";
  else if (/学生/.test(t)) occupation = "学生";
  else if (/フリー|自営|個人/.test(t)) occupation = "個人事業・フリーランス";
  else if (/会社員|通勤|オフィス/.test(t)) occupation = "会社員";
  else occupation = "購入検討者";

  let name = "ゆい";
  if (/会社員|通勤/.test(t)) name = "あかり";
  if (/主婦/.test(t)) name = "みお";
  if (/男性|メンズ/.test(t)) name = "けんた";

  const lifestyleParts: string[] = [];
  if (/通勤|電車|バス/.test(t)) lifestyleParts.push("平日は通勤が中心");
  if (/20代|会社員/.test(t)) lifestyleParts.push("仕事と私生活の両立を意識");
  if (/育児|ママ|パパ/.test(t)) lifestyleParts.push("育児と家事の合間に情報収集");
  if (lifestyleParts.length === 0) {
    lifestyleParts.push(`${t}として、短尺動画で比較検討する`);
  }

  return {
    name,
    age,
    occupation,
    lifestyle: lifestyleParts.join("。"),
    pain: pain || `${t}が感じやすい不便`,
  };
}

function buildPainPoints(input: {
  target: string;
  features: string[];
  blob: string;
}): string[] {
  const { target, features, blob } = input;
  const pains: string[] = [];
  const has = (re: RegExp) => re.test(blob) || features.some((f) => re.test(f));

  if (has(/UV|日焼け|紫外線|日差し/)) {
    if (/通勤/.test(target)) {
      pains.push("夏の通勤中、腕に日差しが当たるのが気になる");
    } else {
      pains.push("屋外で腕の日差し・日焼けが気になる");
    }
  }
  if (has(/涼感|ひんやり|暑|夏/)) {
    pains.push("暑い時期でも腕を覆いたいが、暑苦しい対策は避けたい");
  }
  if (has(/薄手|ゆったり|指穴/)) {
    pains.push("長時間つけても違和感が少ない対策を探している");
  }
  if (has(/時短|簡単/)) {
    pains.push("準備に時間をかけず、手軽に対策したい");
  }
  if (has(/充電|バッテリー/)) {
    pains.push("充電や準備が面倒で続けられない");
  }
  if (pains.length === 0) {
    pains.push(
      `${target}の日常シーンで「もう少し楽にしたい」と感じるポイントを冒頭で言語化する`
    );
  }
  if (pains.length < 3 && /通勤|会社員/.test(target)) {
    pains.push("通勤時に手軽に使える対策が欲しい");
  }
  if (pains.length < 3) {
    pains.push("スペックより、自分の生活に合うかを知りたい");
  }

  return uniqueStrings(pains, 4);
}

function buildSellingPoints(input: {
  features: string[];
  target: string;
}): string[] {
  const { features, target } = input;
  const points = features.slice(0, 6).map((f) => {
    if (/涼感|ひんやり/.test(f)) return "ひんやり涼感をうたった夏向け設計";
    if (/UV|日焼け/.test(f)) return "UVカット・日焼け対策を売りにした腕まわりケア";
    if (/薄手/.test(f)) return "薄手で暑苦しさを抑えやすい";
    if (/ゆったり/.test(f)) return "ゆったり設計で着けやすさを意識";
    if (/指穴/.test(f)) return "指穴付きでズレにくさを訴求しやすい";
    if (/腕カバー|アーム/.test(f)) return "腕の日差し対策に特化した形状";
    return f;
  });

  if (points.length === 0) {
    points.push(`${target}の場面に寄せた商品特徴の提示`);
  }
  return uniqueStrings(points, 6);
}

function buildBenefits(features: string[], pains: string[]): string[] {
  const benefits: string[] = [];
  if (features.some((f) => /涼感|ひんやり|薄手/.test(f))) {
    benefits.push("暑い季節でも腕まわり対策を取り入れやすい（商品説明ベース）");
  }
  if (features.some((f) => /UV|日焼け/.test(f))) {
    benefits.push("腕の日差し対策を短尺で伝えやすい");
  }
  if (features.some((f) => /指穴|ゆったり/.test(f))) {
    benefits.push("着け方・フィット感をビジュアルで示しやすい");
  }
  if (benefits.length === 0 && pains[0]) {
    benefits.push(`${pains[0]}への対処を商品特徴で示す`);
  }
  return uniqueStrings(benefits, 4);
}

function buildHooks(input: {
  target: string;
  features: string[];
  pains: string[];
}): string[] {
  const { target, features, pains } = input;
  const hooks: string[] = [];
  if (/通勤/.test(target) && features.some((f) => /UV|日焼け|腕/.test(f))) {
    hooks.push("夏の通勤、腕の日差し対策してる？");
  }
  if (features.some((f) => /薄手|涼感/.test(f))) {
    hooks.push("長袖は暑い。でも腕の日差しは気になる。");
  }
  if (features.some((f) => /指穴|アーム|腕/.test(f))) {
    hooks.push("通勤の日焼け対策、これなら手軽に取り入れやすいかも");
  }
  if (pains[0] && hooks.length < 3) {
    hooks.push(`${pains[0].replace(/。$/, "")}？`);
  }
  while (hooks.length < 3) {
    hooks.push(`${target}向けに、商品の特徴を最初の3秒で見せる`);
    break;
  }
  return uniqueStrings(
    hooks.filter((h) => !/損して|絶対|必ず|人生変わる/.test(h)),
    3
  );
}

function buildVideoStructure(
  platform: string,
  durationHint = 30
): string[] {
  // デフォルトは悩み→特徴→使用イメージ→CTA（UGC紹介型）
  if (platform === "TikTok" || durationHint <= 30) {
    return [
      "フック: ターゲットの場面＋悩みを一言",
      "悩み: なぜ今それが気になるかを具体化",
      "商品紹介: 商品を画面に出し特徴を1つ",
      "特徴: 商品説明にあるポイントを追加で1〜2つ",
      "使用イメージ: 通勤・外出などの場面イメージ（実体験は断定しない）",
      "CTA: プロフィールリンクへ誘導",
    ];
  }
  return [
    "結論フック",
    "悩みの具体化",
    "商品紹介",
    "特徴の整理",
    "向いている人",
    "CTA",
  ];
}

function computeSalesScore(input: {
  description: string;
  target: string;
  platform: string;
  productUrl: string;
  hasImage: boolean;
  sellingPoints: string[];
  differentiation: string[];
  features: string[];
  tiktok: TikTokProductSnapshot | null;
}): SalesScore {
  const descLen = input.description.trim().length;
  const targetLen = input.target.trim().length;
  const featureBonus = Math.min(20, input.features.length * 4);

  const clarity = clampScore(
    30 +
      Math.min(30, descLen / 10) +
      (targetLen > 4 ? 15 : 0) +
      (input.hasImage ? 10 : 0) +
      featureBonus / 2
  );

  const demandFit = clampScore(
    35 +
      (input.platform === "TikTok" ? 18 : 10) +
      (targetLen > 8 ? 18 : 8) +
      featureBonus / 2 +
      (input.tiktok?.salesCount
        ? Math.min(20, input.tiktok.salesCount / 100)
        : 0)
  );

  const differentiation = clampScore(
    28 +
      input.differentiation.length * 10 +
      input.sellingPoints.length * 5 +
      (input.tiktok?.commissionRate ? 8 : 0)
  );

  const creativePotential = clampScore(
    40 +
      (input.hasImage ? 15 : 0) +
      (input.platform.includes("TikTok") || input.platform.includes("Shorts")
        ? 18
        : 10) +
      Math.min(15, input.features.length * 3)
  );

  const conversionReadiness = clampScore(
    28 +
      (input.productUrl ? 22 : 0) +
      (targetLen > 4 ? 15 : 0) +
      (descLen > 40 ? 12 : 5) +
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
  const measured = Boolean(input.tiktok?.salesCount || input.tiktok?.productId);

  if (clarity < 70) tips.push("商品説明に特徴・使い方をもう少し具体的に");
  if (!input.hasImage) tips.push("商品画像があると実物感が伝わりやすい");
  if (!input.productUrl) tips.push("商品URLがあるとCTA導線が明確になる");
  if (targetLen < 8) tips.push("ターゲットを場面付きで書く（例: 通勤する20代会社員）");
  if (input.features.length < 2) tips.push("商品名に特徴語を足すと分解精度が上がる");
  if (!measured) tips.push("TikTok実績未接続のためスコアはAI推定（参考値）");
  if (tips.length === 0) tips.push("このまま動画企画へ進めてOK（スコアは参考値）");

  return {
    total,
    grade,
    label: labelFromGrade(grade),
    breakdown,
    tips: tips.slice(0, 4),
    baseTotal: total,
    baseBreakdown: { ...breakdown },
    performanceBonus: 0,
    scoreKind: measured ? "measured" : "estimated",
    scoreNote: measured
      ? "商品情報＋外部スナップショットを反映"
      : "AI推定・参考スコア（実測販売データなし）",
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

/**
 * 旧履歴 JSON を安全に正規化（欠落フィールドを埋める）
 */
export function normalizeProductAnalysis(
  raw: ProductAnalysis
): ProductAnalysis {
  const productName = raw.productName || "商品";
  const features =
    raw.productFeatures?.length
      ? raw.productFeatures
      : extractProductFeatures(productName, raw.summary || productName);
  const target = raw.target || raw.targetInsight || "";
  const platform = raw.platform || "TikTok";
  const pains =
    raw.painPoints?.length > 0
      ? raw.painPoints
      : buildPainPoints({ target: target || "購入検討者", features, blob: productName });

  return {
    ...raw,
    version: raw.version === "1.1" ? "1.1" : raw.version || "1.0",
    sellingPoints: raw.sellingPoints?.length ? raw.sellingPoints : features,
    painPoints: pains,
    purchaseReasons: raw.purchaseReasons?.length
      ? raw.purchaseReasons
      : ["特徴が自分の場面に合いそうだから"],
    differentiation: raw.differentiation?.length
      ? raw.differentiation
      : features.slice(0, 2),
    recommendedVideoStructure: raw.recommendedVideoStructure?.length
      ? raw.recommendedVideoStructure
      : buildVideoStructure(platform),
    ctaIdeas: raw.ctaIdeas?.length
      ? raw.ctaIdeas
      : [raw.cta || "プロフィールのリンクから詳細をチェック"],
    target,
    platform,
    category: raw.category || inferCategory(productName, raw.summary || "", features),
    productFeatures: features,
    customerBenefits: raw.customerBenefits?.length
      ? raw.customerBenefits
      : buildBenefits(features, pains),
    objections: raw.objections ?? ["サイズ感が分からない", "本当に必要か迷う"],
    recommendedAngles: raw.recommendedAngles ?? [raw.salesAngle].filter(Boolean),
    recommendedHooks: raw.recommendedHooks?.length
      ? raw.recommendedHooks
      : buildHooks({ target: target || "購入検討者", features, pains }),
    factualClaims: raw.factualClaims ?? features,
    inferredClaims: raw.inferredClaims ?? [],
    uncertainty: raw.uncertainty ?? [
      "効果の強さは個人差があり、商品説明以上の断定はしない",
    ],
    buyerPersonaDetail:
      raw.buyerPersonaDetail ||
      buildPersonaFromTarget(target || "購入検討者", pains[0] || ""),
    hasUserReview: raw.hasUserReview ?? false,
    analysisVersion: raw.analysisVersion || raw.version || "1.0",
    salesScore: normalizeSalesScore(raw.salesScore),
  };
}

const EMPTY_BREAKDOWN: SalesScoreBreakdown = {
  clarity: 50,
  demandFit: 50,
  differentiation: 50,
  creativePotential: 50,
  conversionReadiness: 50,
};

function normalizeSalesScore(
  raw: ProductAnalysis["salesScore"] | undefined
): SalesScore {
  const breakdown = {
    ...EMPTY_BREAKDOWN,
    ...(raw?.breakdown ?? {}),
  };
  const total =
    typeof raw?.total === "number" && Number.isFinite(raw.total)
      ? clampScore(raw.total)
      : clampScore(
          (breakdown.clarity +
            breakdown.demandFit +
            breakdown.differentiation +
            breakdown.creativePotential +
            breakdown.conversionReadiness) /
            5
        );
  const grade = raw?.grade || gradeFromTotal(total);
  return {
    total,
    grade,
    label: raw?.label || labelFromGrade(grade),
    breakdown,
    tips: Array.isArray(raw?.tips) ? raw.tips : [],
    baseTotal: raw?.baseTotal ?? total,
    baseBreakdown: raw?.baseBreakdown ?? { ...breakdown },
    performanceBonus: raw?.performanceBonus ?? 0,
    scoreKind: raw?.scoreKind ?? "estimated",
    scoreNote:
      raw?.scoreNote ?? "AI推定・参考スコア（実測販売データなし）",
  };
}

export async function analyzeProduct(
  request: AnalyzeProductRequest
): Promise<ProductAnalysis> {
  const productName = String(request.product_name ?? "").trim();
  // 説明が空でも商品名から特徴分解できる（商品名のみケース）
  const description =
    String(request.description ?? "").trim() || productName;
  const target = String(request.target ?? "").trim();
  const platform = String(request.platform ?? "").trim();
  const productUrl = String(request.product_url ?? "").trim();
  const imageName = request.image_name?.trim() || null;
  const reviewText = request.review_text?.trim() || "";
  const hasUserReview = reviewText.length >= 20;

  if (!productName) throw new Error("product_name は必須です");
  if (!target) throw new Error("target は必須です");
  if (!platform) throw new Error("platform は必須です");

  const tiktokLookupKey =
    request.tiktok_product_id?.trim() || productUrl || null;
  const tiktok = await fetchTikTokProductSnapshot(tiktokLookupKey);

  const blob = `${productName}\n${description}`;
  const productFeatures = extractProductFeatures(productName, description);
  const category = inferCategory(productName, description, productFeatures);
  const painPoints = buildPainPoints({ target, features: productFeatures, blob });
  const sellingPoints = buildSellingPoints({
    features: productFeatures,
    target,
  });
  const customerBenefits = buildBenefits(productFeatures, painPoints);
  const recommendedHooks = buildHooks({
    target,
    features: productFeatures,
    pains: painPoints,
  });
  const persona = buildPersonaFromTarget(target, painPoints[0] || "");

  const factualClaims = uniqueStrings(
    [
      ...productFeatures,
      imageName ? "商品画像が添付されている" : "",
      productUrl ? "商品URLが指定されている" : "",
    ].filter(Boolean),
    10
  );

  const inferredClaims = uniqueStrings(
    [
      `${target}の生活場面に寄せて訴求すると反応を取りやすい（推定）`,
      platform === "TikTok"
        ? "短尺の冒頭で悩み→特徴の順が向いている（推定）"
        : `${platform}では説明寄り構成も検討余地あり（推定）`,
    ],
    4
  );

  const uncertainty = uniqueStrings(
    [
      "涼しさ・UV効果などの強さは個人差があり、商品説明以上は断定しない",
      hasUserReview
        ? "入力レビューを参考にするが、全員に当てはまるとは限らない"
        : "実使用レビュー未入力のため、使用感・効果実感は表現しない",
      !tiktok
        ? "TikTok販売実績データ未接続のためスコアは参考値"
        : "",
    ].filter(Boolean),
    4
  );

  const objections = uniqueStrings(
    [
      "サイズ感・フィット感が動画だけでは分かりにくい",
      "本当に必要か、他の対策で足りるか迷う",
      productFeatures.some((f) => /UV|日焼け/.test(f))
        ? "UV対策の程度が数値で示されていない場合がある"
        : "スペックの根拠が説明文だけでは弱い場合がある",
    ],
    3
  );

  const differentiation = uniqueStrings(
    [
      ...productFeatures.slice(0, 3).map((f) => `明示特徴: ${f}`),
      "スペック羅列より、通勤・外出など場面での使い方を先に見せる",
      hasUserReview
        ? "入力されたレビュー観点を補助情報として使える"
        : "実体験レビューがないため、紹介・使用イメージ中心で信頼を作る",
    ],
    4
  );

  const purchaseReasons = uniqueStrings(
    [
      ...sellingPoints.slice(0, 2),
      painPoints[0] ? `「${painPoints[0]}」に対処できそうだから` : "",
      "使い方・場面が具体的で、購入後のイメージが湧くから",
      productUrl
        ? "リンク先で詳細をすぐ確認できるから"
        : "次の行動（プロフィール誘導）が明確だから",
    ].filter(Boolean),
    4
  );

  const salesAngle = `${target}の「${painPoints[0] || "不便"}」に対し、${
    productFeatures[0] || productName
  }などの特徴で解決イメージを示す`;

  const recommendedAngles = uniqueStrings(
    [
      salesAngle,
      recommendedHooks[0]
        ? `フック案「${recommendedHooks[0]}」から入る悩み起点`
        : "",
      "特徴を1つずつ見せ、盛りすぎない紹介",
    ].filter(Boolean),
    3
  );

  const offerStyle = hasUserReview
    ? "入力レビューを踏まえた紹介＋補足"
    : "商品情報ベースの紹介・使用イメージ（実体験レビューは含まない）";

  const cta =
    platform === "TikTok"
      ? "プロフィールのリンクから詳細をチェック"
      : platform === "Instagram Reels"
        ? "プロフィールのハイライト/リンクから詳細へ"
        : "概要欄のリンクから詳細を確認";

  const ctaIdeas = uniqueStrings(
    [
      cta,
      "気になる人は保存して、あとで見比べてみて",
      "同じ場面で困っている人はコメントで教えて",
    ],
    3
  );

  const recommendedVideoStructure = buildVideoStructure(platform);

  const buyerPersona = [
    `${persona.name}（${persona.age} / ${persona.occupation}）`,
    persona.lifestyle,
    `悩み: ${persona.pain}`,
    `入力ターゲット: ${target}`,
  ].join("。");

  const summary = [
    `${productName}は「${target}」向けに、${platform}で訴求する${category}カテゴリの商品です。`,
    productFeatures.length > 0
      ? `商品情報から読み取れる特徴は「${productFeatures.slice(0, 4).join(" / ")}」です。`
      : "特徴語が少ないため、説明文の具体化が推奨されます。",
    `悩みの起点は「${painPoints[0]}」。${
      hasUserReview
        ? "レビュー入力があるため補足に使えます。"
        : "実使用レビューは未入力のため、紹介・使用イメージとして構成します。"
    }`,
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
    features: productFeatures,
    tiktok,
  });

  const analysis: ProductAnalysis = {
    version: "1.1",
    analysisVersion: "1.1",
    analyzedAt: new Date().toISOString(),
    source: resolveSource(request, tiktok),
    productName,
    summary,
    sellingPoints,
    painPoints,
    targetInsight: `${target}に対して、場面の不便を先に提示し、商品特徴で解決イメージを示す`,
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
    target,
    platform,
    category,
    productFeatures,
    customerBenefits,
    objections,
    recommendedAngles,
    recommendedHooks,
    factualClaims,
    inferredClaims,
    uncertainty,
    buyerPersonaDetail: persona,
    hasUserReview,
  };

  return normalizeProductAnalysis(analysis);
}

/** 既存 generate-* API へ渡すための文字列化（契約は変更しない） */
export function buildApiProductName(
  analysis: ProductAnalysis,
  description: string
): string {
  const normalized = normalizeProductAnalysis(analysis);
  return [
    normalized.productName,
    "",
    "【商品説明】",
    description.trim() || "(未入力)",
    normalized.productUrl ? `【商品URL】\n${normalized.productUrl}` : "",
    "",
    "【販売スコア（AI推定）】",
    `${normalized.salesScore.total}/100 (${normalized.salesScore.grade}) ${normalized.salesScore.label}`,
    normalized.salesScore.scoreNote || "",
    "",
    "【AI商品分析】",
    normalized.summary,
    "",
    "カテゴリ:",
    normalized.category || "",
    "",
    "商品特徴:",
    ...(normalized.productFeatures || []).map(
      (item, index) => `${index + 1}. ${item}`
    ),
    "",
    "購入者ペルソナ:",
    normalized.buyerPersona,
    "",
    "売れるポイント:",
    ...normalized.sellingPoints.map((item, index) => `${index + 1}. ${item}`),
    "",
    "購入理由:",
    ...normalized.purchaseReasons.map((item, index) => `${index + 1}. ${item}`),
    "",
    "顧客の悩み:",
    ...normalized.painPoints.map((item, index) => `${index + 1}. ${item}`),
    "",
    "推奨フック:",
    ...(normalized.recommendedHooks || []).map(
      (item, index) => `${index + 1}. ${item}`
    ),
    "",
    "競合との差別化:",
    ...normalized.differentiation.map((item, index) => `${index + 1}. ${item}`),
    "",
    "推奨動画構成:",
    ...normalized.recommendedVideoStructure.map(
      (item, index) => `${index + 1}. ${item}`
    ),
    "",
    `販売アングル: ${normalized.salesAngle}`,
    `オファースタイル: ${normalized.offerStyle}`,
    `推奨CTA: ${normalized.cta}`,
    "不確実性:",
    ...(normalized.uncertainty || []).map(
      (item, index) => `${index + 1}. ${item}`
    ),
    normalized.hasImage
      ? `商品画像: あり（${normalized.imageName}）`
      : "商品画像: なし",
    normalized.tiktok?.productId
      ? `TikTok商品ID: ${normalized.tiktok.productId}`
      : "TikTok商品データ: 未接続",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildApiTarget(
  analysis: ProductAnalysis,
  target: string
): string {
  const normalized = normalizeProductAnalysis(analysis);
  const formTarget = target.trim() || normalized.target || "";
  return [
    formTarget,
    "",
    "【購入者ペルソナ】",
    normalized.buyerPersona,
    "",
    "【ターゲット洞察】",
    normalized.targetInsight,
    "",
    "刺さる切り口:",
    ...normalized.painPoints.slice(0, 2).map((item) => `- ${item}`),
    "",
    "購入理由:",
    ...normalized.purchaseReasons.slice(0, 2).map((item) => `- ${item}`),
  ].join("\n");
}
