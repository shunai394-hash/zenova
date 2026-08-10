/**
 * TOP「こんな動画が作れます」— AI生成デモ動画用データ。
 *
 * 実在TikTok動画は使用しない。Zenovaオリジナル構成。
 *
 * 差し替え（AI生成デモMP4）:
 *   public/demos/beauty-ugc.mp4
 *   public/demos/gadget-review.mp4
 *   public/demos/before-after.mp4
 * に置き、下の videoUrl / thumbnail を設定する。
 */

import type { VideoStyleId } from "@/lib/analyze/video-settings";

export const DEMO_SECTION_TITLE = "こんな動画が作れます";
export const DEMO_SECTION_SUBTITLE =
  "ZenovaのAI生成デモ構成です。美容UGC・ガジェットレビュー・Before Afterの3タイプをプレビューできます。";

export type DemoCompositionBeat = {
  timing: string;
  title: string;
  direction: string;
};

export type DemoCompositionItem = {
  id: string;
  title: string;
  description: string;
  /** Analyze 連携用スタイル */
  templateKey: VideoStyleId;
  duration: string;
  durationSec: number;
  /** AI生成デモのサムネ（差し替え可） */
  thumbnail: string | null;
  /** AI生成デモのMP4（差し替え可） */
  videoUrl: string | null;
  /** プレースホルダ用グラデーション識別 */
  accent: string;
  composition: DemoCompositionBeat[];
};

export const DEMO_COMPOSITIONS: DemoCompositionItem[] = [
  {
    id: "demo-beauty-ugc",
    title: "美容UGC",
    description:
      "本音レビュー風。使用感→変化→CTAまでを15秒にまとめるAI生成デモ構成",
    templateKey: "ugc",
    duration: "15秒",
    durationSec: 15,
    thumbnail: null, // "/demos/beauty-ugc.jpg"
    videoUrl: null, // "/demos/beauty-ugc.mp4"
    accent: "from-rose-900/40 via-zinc-900 to-black",
    composition: [
      {
        timing: "0–3s",
        title: "本音フック",
        direction: "カメラ目線で『正直に言うと…』系の一言",
      },
      {
        timing: "3–8s",
        title: "使用シーン",
        direction: "手元・テクスチャ・塗布のリアルなUGCカット",
      },
      {
        timing: "8–12s",
        title: "ベネフィット",
        direction: "肌感の変化・続けたくなる理由を短く",
      },
      {
        timing: "12–15s",
        title: "CTA",
        direction: "プロフ誘導＋保存を促す一言",
      },
    ],
  },
  {
    id: "demo-gadget-review",
    title: "ガジェットレビュー",
    description:
      "『使ってどうだったか』を軸にした商品レビュー型のAI生成デモ構成",
    templateKey: "product_review",
    duration: "20秒",
    durationSec: 20,
    thumbnail: null, // "/demos/gadget-review.jpg"
    videoUrl: null, // "/demos/gadget-review.mp4"
    accent: "from-sky-900/40 via-zinc-900 to-black",
    composition: [
      {
        timing: "0–3s",
        title: "結論先出し",
        direction: "『これ買って正解だった』の一言で止める",
      },
      {
        timing: "3–9s",
        title: "開封〜セットアップ",
        direction: "パッケージ→本体→最初の起動をテンポよく",
      },
      {
        timing: "9–16s",
        title: "実使用レビュー",
        direction: "音質・持ち運び・日常シーンの推しポイント",
      },
      {
        timing: "16–20s",
        title: "向いている人＋CTA",
        direction: "誰向けかを明示し、リンク誘導",
      },
    ],
  },
  {
    id: "demo-before-after",
    title: "Before After",
    description:
      "変化が一目で分かる対比カットでスクロールを止めるAI生成デモ構成",
    templateKey: "before_after",
    duration: "15秒",
    durationSec: 15,
    thumbnail: null, // "/demos/before-after.jpg"
    videoUrl: null, // "/demos/before-after.mp4"
    accent: "from-emerald-900/40 via-zinc-900 to-black",
    composition: [
      {
        timing: "0–3s",
        title: "Before提示",
        direction: "悩みのある状態を大胆に見せる",
      },
      {
        timing: "3–7s",
        title: "転換",
        direction: "商品登場＋使い始めのカット",
      },
      {
        timing: "7–12s",
        title: "After対比",
        direction: "同じアングルで変化を並べる",
      },
      {
        timing: "12–15s",
        title: "CTA",
        direction: "『気になる人はリンクから』で締める",
      },
    ],
  },
];

export function buildAnalyzeDemoHref(templateKey: VideoStyleId): string {
  return `/analyze?template=${encodeURIComponent(templateKey)}`;
}
