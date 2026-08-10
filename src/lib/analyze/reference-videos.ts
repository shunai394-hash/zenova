/**
 * Analyze 用「参考動画」カード（ダミー可）。
 * 将来は generated_videos の同カテゴリ人気動画へ差し替え。
 */

export type ReferenceVideoCard = {
  id: string;
  title: string;
  style: string;
  category: string;
  duration: string;
  reason: string;
  /** null = プレースホルダ */
  thumbnail: string | null;
  videoUrl: string | null;
};

export const REFERENCE_VIDEOS: ReferenceVideoCard[] = [
  {
    id: "ref-ugc-1",
    title: "本音UGCレビュー",
    style: "UGC",
    category: "美容・コスメ",
    duration: "15秒",
    reason: "冒頭の本音フック → 使用感 → プロフ誘導が伸びやすい型",
    thumbnail: null,
    videoUrl: null,
  },
  {
    id: "ref-compare-1",
    title: "2商品比較",
    style: "比較",
    category: "ガジェット",
    duration: "30秒",
    reason: "比較軸を2つに絞ると視聴維持が安定しやすい",
    thumbnail: null,
    videoUrl: null,
  },
  {
    id: "ref-rank-1",
    title: "ランキングTOP3",
    style: "ランキング",
    category: "便利グッズ",
    duration: "30秒",
    reason: "第3位から見せる構成で離脱を抑える定番フォーマット",
    thumbnail: null,
    videoUrl: null,
  },
];
