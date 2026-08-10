/**
 * TOPランディング文言・CTA定数
 * A/Bテストや景表法リスク回避のため差し替えやすくしておく。
 *
 * 候補例（HERO_COPY_MAIN）:
 * - 「商品を貼るだけで、バズりやすいTikTok動画をAIが作る」（推奨・初期値）
 * - 「商品を貼るだけで、売れやすいTikTok動画をAIが作る」
 * - 「商品を貼るだけで、売れるTikTok動画をAIが作る」（断定表現・要確認）
 */
export const BRAND_NAME = "ZENOVA";

export const HERO_COPY_MAIN =
  "商品を貼るだけで、バズりやすいTikTok動画をAIが作る";

export const HERO_COPY_SUB =
  "商品URLか画像を貼るだけ。日本語特化のAIが台本・フック・動画まで一気に作ります。";

export const CTA_CREATE_VIDEO = "→ 動画を作る";

/** ヒーロー主CTA（差し替え用） */
export const VIDEO_CREATE_CTA = "AI動画を作成する";

export const CTA_UPLOAD_IMAGE = "画像をアップロード";
export const HERO_URL_PLACEHOLDER = "商品URLを貼る";

/** ヒーロー入力欄下の対応内容 */
export const HERO_INPUT_SUPPORT = [
  "商品URL",
  "商品画像",
  "商品説明",
] as const;

export const HERO_USE_CASES =
  "TikTokアフィリエイト、TikTok Shop、自社商品の動画制作に対応";

export const STEPS_SECTION_TITLE = "3ステップで完成";

export const STEPS = [
  {
    step: "STEP1",
    title: "商品を入力",
    body: "URLか画像を貼るだけ",
  },
  {
    step: "STEP2",
    title: "AIが分析",
    body: "台本・フックを自動生成",
  },
  {
    step: "STEP3",
    title: "動画完成",
    body: "そのまま投稿できる動画",
  },
] as const;

export const SAMPLE_SECTION_TITLE = "こんな動画が作れます";

/**
 * @deprecated TOPサンプルは `@/lib/landing/sample-videos` の SAMPLE_VIDEOS を使用。
 * 互換のため残置（旧3件）。新規は sample-videos.ts を編集してください。
 */
export const SAMPLE_VIDEOS = [
  {
    id: "sample-1",
    title: "サンプル動画①",
    description: "ガジェット系・冒頭フック重視の15秒構成",
    thumbnailLabel: "SAMPLE 01",
  },
  {
    id: "sample-2",
    title: "サンプル動画②",
    description: "美容・ビフォーアフター訴求の縦型ショート",
    thumbnailLabel: "SAMPLE 02",
  },
  {
    id: "sample-3",
    title: "サンプル動画③",
    description: "店舗商品・日常シーンからCTAまでの流れ",
    thumbnailLabel: "SAMPLE 03",
  },
] as const;

export const AUDIENCE_SECTION_TITLE = "こんな人に使われています";

export const AUDIENCE_CARDS = [
  {
    id: "affiliate",
    icon: "📱",
    title: "TikTokアフィリエイター",
    body: "A8などで見つけた商品のURLを貼るだけで、台本も動画もAIが作ってくれる",
  },
  {
    id: "shop",
    icon: "🛍️",
    title: "TikTok Shopセラー",
    body: "商品画像をアップするだけで、バズりやすい動画構成を提案してくれる",
  },
  {
    id: "store",
    icon: "🏪",
    title: "個人・店舗",
    body: "自分の商品を動画にしたいけど、編集できない人でも使える",
  },
] as const;

export const NAV_LINKS = [
  { href: "/analyze", label: "動画を作る" },
  { href: "/history", label: "履歴" },
  { href: "/products", label: "商品を探す" },
  { href: "/pricing", label: "料金プラン" },
  { href: "/login", label: "ログイン" },
] as const;

/** 「Zenovaが選ばれる理由」セクション */
export const REASONS_SECTION_TITLE = "Zenovaが選ばれる理由";

export const REASONS = [
  {
    id: "japanese",
    icon: "🇯🇵",
    title: "日本語特化",
    body: "日本のTikTok・アフィリエイト市場向けに設計されたAI動画ツール",
  },
  {
    id: "fast",
    icon: "⚡",
    title: "最短数分で動画完成",
    body: "商品URLや画像を貼るだけで台本・分析・動画生成まで自動",
  },
  {
    id: "multi-ai",
    icon: "🤖",
    title: "複数AIを最適に組み合わせ",
    body: "分析・台本・動画生成を用途に応じたAIモデルで処理",
  },
] as const;

/** フッター */
export const FOOTER_TAGLINE =
  "商品を貼るだけで、売れるTikTok動画をAIが作る";

export const FOOTER_LINKS = {
  main: [
    { href: "/products", label: "商品を探す" },
    { href: "/analyze", label: "動画を作る" },
    { href: "/pricing", label: "料金プラン" },
    { href: "/history", label: "生成履歴" },
  ],
  legal: [
    { href: "/terms", label: "利用規約" },
    { href: "/privacy", label: "プライバシーポリシー" },
    {
      href: "mailto:support@zenova.example",
      label: "お問い合わせ",
    },
  ],
} as const;

/** SNS URL（後で差し替え） */
export const SNS_URLS = {
  x: "#",
  tiktok: "#",
  discord: "#",
} as const;

export const FOOTER_COPYRIGHT = "© 2026 Zenova. All rights reserved.";
