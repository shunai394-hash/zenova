import type { VideoTemplate, VideoTemplateId } from "./types";

export const VIDEO_TEMPLATES: Record<VideoTemplateId, VideoTemplate> = {
  problem_solution: {
    id: "problem_solution",
    name: "Problem → Solution",
    nameJa: "悩み→解決",
    description:
      "冒頭で不便を言語化し、商品で解決、証拠とCTAで締める王道販売構成",
    bestFor: ["ガジェット", "ヘルスケア", "ライフスタイル", "季節家電"],
    durationSec: 15,
    hookStyle: "悩み一言フック（自分ごと化）",
    ctaStyle: "プロフィールリンクで詳細確認",
    beats: [
      {
        timing: "0-2",
        title: "悩み提示",
        direction: "ターゲットの不便を画面と一言で突きつける",
      },
      {
        timing: "2-5",
        title: "共感",
        direction: "あるあるシーンを短く見せる",
      },
      {
        timing: "5-10",
        title: "解決デモ",
        direction: "商品使用で不便が消える瞬間を見せる",
      },
      {
        timing: "10-13",
        title: "証拠",
        direction: "ポイントを1つだけ強調（コスパ/時短/効果）",
      },
      {
        timing: "13-15",
        title: "CTA",
        direction: "プロフィールリンク誘導",
      },
    ],
  },

  before_after: {
    id: "before_after",
    name: "Before → After",
    nameJa: "ビフォーアフター",
    description:
      "変化が一目でわかる対比構成。美容・掃除・体感系に強い",
    bestFor: ["ビューティー", "ヘルスケア", "ライフスタイル"],
    durationSec: 15,
    hookStyle: "変化の結論を先出し",
    ctaStyle: "同じ変化を試すならリンクへ",
    beats: [
      {
        timing: "0-3",
        title: "Before",
        direction: "不満・状態の悪さをクローズアップ",
      },
      {
        timing: "3-6",
        title: "転換",
        direction: "商品登場・使い始め",
      },
      {
        timing: "6-12",
        title: "After",
        direction: "改善後の状態を対比で見せる",
      },
      {
        timing: "12-15",
        title: "CTA",
        direction: "変化の要点を一言 + リンク誘導",
      },
    ],
  },

  unboxing: {
    id: "unboxing",
    name: "Unboxing",
    nameJa: "開封レビュー",
    description:
      "手元アップで開封・質感・サイズ感を見せる。実物欲を刺激",
    bestFor: ["ガジェット", "ファッション", "ライフスタイル"],
    durationSec: 15,
    hookStyle: "開封の瞬間 / 中身チラ見せ",
    ctaStyle: "詳細・価格はプロフリンク",
    beats: [
      {
        timing: "0-2",
        title: "パッケージ",
        direction: "箱・外観をテンポよく見せる",
      },
      {
        timing: "2-7",
        title: "開封",
        direction: "取り出し・付属品・第一印象",
      },
      {
        timing: "7-12",
        title: "質感チェック",
        direction: "手触り・サイズ比較・細部アップ",
      },
      {
        timing: "12-15",
        title: "CTA",
        direction: "気になる人はリンクで詳細へ",
      },
    ],
  },

  comparison: {
    id: "comparison",
    name: "Comparison",
    nameJa: "比較レビュー",
    description:
      "迷いを解消する比較構成。コスパ・選び方訴求向き",
    bestFor: ["ガジェット", "ビューティー", "その他"],
    durationSec: 15,
    hookStyle: "どっちがいい？の問いかけ",
    ctaStyle: "結論を出してリンクへ",
    beats: [
      {
        timing: "0-3",
        title: "比較軸提示",
        direction: "価格/機能/使いやすさなど軸を1つ決める",
      },
      {
        timing: "3-8",
        title: "対比",
        direction: "A vs B（または普通の方法 vs 商品）を見せる",
      },
      {
        timing: "8-12",
        title: "結論",
        direction: "誰にどれが向くかを明確化",
      },
      {
        timing: "12-15",
        title: "CTA",
        direction: "おすすめ側のリンク誘導",
      },
    ],
  },

  lifestyle: {
    id: "lifestyle",
    name: "Lifestyle",
    nameJa: "ライフスタイル",
    description:
      "世界観と日常シーンに商品を自然に埋め込む。保存・共感向き",
    bestFor: ["ファッション", "ビューティー", "ライフスタイル"],
    durationSec: 15,
    hookStyle: "憧れの日常シーンから入る",
    ctaStyle: "同じ雰囲気で使いたい人はリンクへ",
    beats: [
      {
        timing: "0-3",
        title: "世界観",
        direction: "朝ルーティンや外出シーンなど雰囲気作り",
      },
      {
        timing: "3-8",
        title: "自然な使用",
        direction: "生活の中で商品が登場する",
      },
      {
        timing: "8-12",
        title: "ベネフィット",
        direction: "気分・見た目・快適さの変化を短く",
      },
      {
        timing: "12-15",
        title: "CTA",
        direction: "保存誘導 + プロフィールリンク",
      },
    ],
  },
};

export const VIDEO_TEMPLATE_LIST: VideoTemplate[] = Object.values(
  VIDEO_TEMPLATES
);
