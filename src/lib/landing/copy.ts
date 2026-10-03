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

export const HERO_COPY_MAIN = "動画を作るのではなく、\n「使える1本」まで。";

export const HERO_COPY_SUB = "商品・SNS・広告・ブランド。目的を先に決めて、AIが生成。\n完成後も映像を見直し、改善点を次の生成へ反映します。";

export const CTA_CREATE_VIDEO = "→ 動画を作る";

/** ヒーロー主CTA（差し替え用） */
export const VIDEO_CREATE_CTA = "この目的で動画を作る";

export const CTA_UPLOAD_IMAGE = "画像をアップロード";
export const HERO_URL_PLACEHOLDER = "商品URLを貼る";

/** ヒーロー入力欄下の対応内容 */
export const HERO_INPUT_SUPPORT = [
  "商品URL",
  "商品画像",
  "商品説明",
] as const;

export const HERO_USE_CASES = "商品を売る・SNSで目を止めてもらう・新商品を伝える・ブランドを見せる。目的から動画を組み立てます。";

export const STEPS_SECTION_TITLE = "生成して終わりにしない";

export const STEPS = [
  { step: "01 · PURPOSE", title: "まず、目的を決める", body: "売る・目立たせる・伝える。何のための動画かを先に決めるから、操作に迷いにくい。" },
  { step: "02 · CREATE", title: "AIが1本を組み立てる", body: "商品やアイデアから、構成・動き・カメラ・演出をまとめて生成する。" },
  { step: "03 · IMPROVE", title: "見直して、次へ改善", body: "完成映像を見て改善点を選択。次の生成に反映し、ゼロからやり直さない。" },
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

export const AUDIENCE_SECTION_TITLE = "こんな「困りごと」から使える";

export const AUDIENCE_CARDS = [
  { id: "time", icon: "01", title: "動画制作に時間をかけられない", body: "プロンプトや編集を一から覚えなくても、目的と素材から制作を始められる。" },
  { id: "quality", icon: "02", title: "AI動画を作っても、微妙で終わる", body: "生成結果を見直し、「何を直すか」を明示。改善点を次の生成へつなげる。" },
  { id: "purpose", icon: "03", title: "何を作ればいいか決められない", body: "商品CM・SNS・広告・ブランドなど、先に目的を選んでから制作できる。" },
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

/** 「Zenovaが選ばれる理由」セクション */
export const REASONS_SECTION_TITLE = "ZENOVAで得られること";

export const REASONS = [
  { id: "less-friction", icon: "01", title: "迷う時間を減らす", body: "目的 → 素材 → 生成という順番で進める。専門的な設定は必要なときだけ触れられる。" },
  { id: "better-iterations", icon: "02", title: "失敗を次に活かせる", body: "生成結果の改善点を選び、次のプロンプトへ自動反映。試行錯誤を「やり直し」で終わらせない。" },
  { id: "usable-output", icon: "03", title: "完成後の使い道まで考える", body: "商品・SNS・広告・ブランドという目的から、必要な見せ方を選べる。" },
] as const;

export const FOOTER_TAGLINE = "生成して終わりにしない。使える動画になるまで改善する。";

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
