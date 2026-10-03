/**
 * TOPランディング文言・CTA定数
 */
export const BRAND_NAME = "ZENOVA";

export const HERO_COPY_MAIN = "アイデアから、\n使える映像を。";

export const HERO_COPY_SUB = "画像・動画・音声・プロンプトから、AIで映像をつくる。\nVideoから始めて、Story・Character・Avatarへ広げられます。";

export const CTA_CREATE_VIDEO = "→ Create Studioを開く";
export const VIDEO_CREATE_CTA = "動画を作る";
export const CTA_UPLOAD_IMAGE = "画像をアップロード";
export const HERO_URL_PLACEHOLDER = "商品URLを貼る";

export const HERO_INPUT_SUPPORT = [
  "商品画像",
  "プロンプト",
  "参照素材",
] as const;

export const HERO_USE_CASES = "商品CM・SNS・広告・ブランド・ストーリー。目的に合わせて、同じCreate Studioから制作できます。";

export const STEPS_SECTION_TITLE = "生成して終わりにしない";

export const STEPS = [
  { step: "01 · CREATE", title: "素材とアイデアを入れる", body: "画像がなくても、プロンプトだけでも始められる。" },
  { step: "02 · GENERATE", title: "AIが映像をつくる", body: "モデル・長さ・比率など、必要なコントロールを選んで生成する。" },
  { step: "03 · IMPROVE", title: "見直して、次へ改善", body: "完成映像を確認し、改善点を次の生成へ反映する。" },
] as const;

export const SAMPLE_SECTION_TITLE = "こんな動画が作れます";

export const SAMPLE_VIDEOS = [
  { id: "sample-1", title: "サンプル動画①", description: "ガジェット系・冒頭フック重視の15秒構成", thumbnailLabel: "SAMPLE 01" },
  { id: "sample-2", title: "サンプル動画②", description: "美容・ビフォーアフター訴求の縦型ショート", thumbnailLabel: "SAMPLE 02" },
  { id: "sample-3", title: "サンプル動画③", description: "店舗商品・日常シーンからCTAまでの流れ", thumbnailLabel: "SAMPLE 03" },
] as const;

export const AUDIENCE_SECTION_TITLE = "つくりたいものから始める";

export const AUDIENCE_CARDS = [
  { id: "video", icon: "01", title: "動画をすぐ作りたい", body: "画像を入れてプロンプトを書く。画像なしのText to Videoにも対応。" },
  { id: "story", icon: "02", title: "ストーリーを作りたい", body: "複数カットをつないだ映像制作へ拡張できるCreate Studio。" },
  { id: "character", icon: "03", title: "自分のキャラクターを作りたい", body: "Character・Avatar・将来のAI Personまで同じ制作基盤につなげる。" },
] as const;

export const NAV_LINKS = [
  { href: "/video", label: "Create" },
  { href: "/video", label: "Video" },
  { href: "/voice", label: "Voice" },
  { href: "/history", label: "履歴" },
  { href: "/products", label: "商品を探す" },
  { href: "/pricing", label: "料金プラン" },
  { href: "/login", label: "ログイン" },
] as const;

export const REASONS_SECTION_TITLE = "ZENOVAで得られること";

export const REASONS = [
  { id: "less-friction", icon: "01", title: "すぐ作り始められる", body: "画像でも、プロンプトでも始められる。細かな設定は必要なときだけ触れられる。" },
  { id: "better-iterations", icon: "02", title: "生成を一度で終わらせない", body: "結果を見直し、改善点を次の生成へ反映する。" },
  { id: "one-studio", icon: "03", title: "制作を一つの場所にまとめる", body: "VideoからStory・Character・Avatar、さらにAI Personへ拡張する。" },
] as const;

export const FOOTER_TAGLINE = "つくる。見直す。改善する。次の表現へ。";

export const FOOTER_LINKS = {
  main: [
    { href: "/video", label: "Create" },
    { href: "/history", label: "生成履歴" },
    { href: "/pricing", label: "料金プラン" },
  ],
  legal: [
    { href: "/terms", label: "利用規約" },
    { href: "/privacy", label: "プライバシーポリシー" },
    { href: "mailto:support@zenova.example", label: "お問い合わせ" },
  ],
} as const;

export const SNS_URLS = { x: "#", tiktok: "#", discord: "#" } as const;
export const FOOTER_COPYRIGHT = "© 2026 Zenova. All rights reserved.";
