/**
 * TOPランディング文言・CTA定数
 * A/Bテストや表示文言の変更を集約する。
 */
export const BRAND_NAME = "ZENOVA";

export const HERO_COPY_MAIN =
  "商品から、伝わるショート動画を。";

export const HERO_COPY_SUB =
  "商品URLか画像を入力。日本語の台本・フック・映像づくりを、ひとつの制作フローに。";

export const CTA_CREATE_VIDEO = "→ 動画を作る";
export const VIDEO_CREATE_CTA = "AI動画を作成する";
export const CTA_UPLOAD_IMAGE = "画像をアップロード";
export const HERO_URL_PLACEHOLDER = "商品URLを貼り付ける";

export const HERO_INPUT_SUPPORT = [
  "商品URL",
  "商品画像",
  "商品説明",
] as const;

export const HERO_USE_CASES =
  "TikTokアフィリエイト、TikTok Shop、自社商品の動画制作に対応";

export const STEPS_SECTION_TITLE = "ひとつの流れで、動画制作へ";

export const STEPS = [
  { step: "STEP1", title: "商品を入力", body: "URLまたは画像から制作をスタート" },
  { step: "STEP2", title: "構成を組み立てる", body: "フック・台本・見せ方を整理" },
  { step: "STEP3", title: "動画を生成", body: "設定を確認して映像制作へ" },
] as const;

export const SAMPLE_SECTION_TITLE = "こんな動画が作れます";

export const SAMPLE_VIDEOS = [
  { id: "sample-1", title: "ガジェットレビュー", description: "冒頭のフックを重視したショート動画構成", thumbnailLabel: "SAMPLE 01" },
  { id: "sample-2", title: "美容・ビューティー", description: "使用シーンとベネフィットを伝える構成", thumbnailLabel: "SAMPLE 02" },
  { id: "sample-3", title: "商品ストーリー", description: "日常シーンから行動喚起までを設計", thumbnailLabel: "SAMPLE 03" },
] as const;

export const AUDIENCE_SECTION_TITLE = "商品を届けたい人のために";

export const AUDIENCE_CARDS = [
  { id: "affiliate", icon: "↗", title: "アフィリエイター", body: "紹介したい商品のURLから、動画の企画と制作を始める。" },
  { id: "shop", icon: "◈", title: "オンラインセラー", body: "商品画像を起点に、見せ方や訴求の方向性を組み立てる。" },
  { id: "store", icon: "＋", title: "ブランド・店舗", body: "伝えたい特徴を短い動画フォーマットへ落とし込む。" },
] as const;

export const NAV_LINKS = [
  { href: "/analyze", label: "動画を作る" },
  { href: "/voice", label: "Voice" },
  { href: "/video", label: "Video" },
  { href: "/history", label: "履歴" },
  { href: "/products", label: "商品を探す" },
  { href: "/pricing", label: "料金プラン" },
  { href: "/login", label: "ログイン" },
] as const;

export const REASONS_SECTION_TITLE = "制作に集中できる、シンプルな流れ";

export const REASONS = [
  { id: "japanese", icon: "JP", title: "日本語の制作フロー", body: "日本語で商品情報を整理し、フックや台本のたたき台を作成。" },
  { id: "flow", icon: "→", title: "企画から生成まで", body: "商品入力から構成づくり、動画生成へと進められる設計。" },
  { id: "control", icon: "◫", title: "選べる制作スタイル", body: "用途に合わせて動画の方向性を選び、制作を始められます。" },
] as const;

export const FOOTER_TAGLINE =
  "商品から、ショート動画の企画・台本・映像制作を支援するAIスタジオ。";

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
  ],
} as const;

export const SNS_URLS = {
  x: "",
  tiktok: "",
  discord: "",
} as const;

export const FOOTER_COPYRIGHT = "© 2026 Zenova. All rights reserved.";
