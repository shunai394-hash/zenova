/**
 * FAQ 定数（差し替え・FAQPage JSON-LD 用に構造を分離）
 *
 * 将来の JSON-LD 例:
 *   import { FAQ_ITEMS, buildFaqPageJsonLd } from "@/lib/landing/faq";
 *   <script type="application/ld+json">{JSON.stringify(buildFaqPageJsonLd())}</script>
 */

export type FaqItem = {
  id: string;
  /** Schema.org Question.name 相当 */
  question: string;
  /** Schema.org Answer.text 相当 */
  answer: string;
};

export const FAQ_SECTION_TITLE = "よくある質問";

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "products",
    question: "どんな商品で動画を作れますか？",
    answer:
      "商品URLまたは商品画像があれば利用できます。Amazon・楽天・A8などのアフィリエイトリンクや自社商品の画像に対応しています。対応サービスは順次拡大予定です。",
  },
  {
    id: "models",
    question: "どのAIモデルを使用していますか？",
    answer:
      "用途に応じて複数のAIモデルを組み合わせています。動画生成には高品質な動画生成AI、分析・台本生成には大規模言語モデルを使用しています。※ 利用モデルは今後のアップデートで拡充予定です。",
  },
  {
    id: "speed",
    question: "動画はどれくらいで完成しますか？",
    answer:
      "通常は数十秒〜数分程度です。選択する動画スタイルやサーバーの混雑状況によって変わります。",
  },
  {
    id: "platforms",
    question: "TikTok以外でも使えますか？",
    answer:
      "はい。YouTube ShortsやInstagram Reelsなど縦型ショート動画全般に活用いただけます。",
  },
  {
    id: "prepare",
    question: "商品は自分で用意する必要がありますか？",
    answer:
      "はい。商品URLまたは画像をご用意ください。「商品を探す（/products）」機能からアフィリエイト商品を見つけることもできます。",
  },
  {
    id: "free",
    question: "無料で試せますか？",
    answer:
      "Freeプランで月10回まで動画生成をお試しいただけます。制限を超えた場合は有料プランへのアップグレードをご検討ください。",
  },
  {
    id: "copyright",
    question: "生成した動画の著作権はどうなりますか？",
    answer:
      "Zenovaで生成した動画はお客様ご自身のものです。商業利用も可能ですが、元の商品画像の権利については各サービスの規約をご確認ください。",
  },
];

/**
 * FAQPage JSON-LD を生成（未使用でも構造だけ用意）
 * @see https://schema.org/FAQPage
 */
export function buildFaqPageJsonLd(items: FaqItem[] = FAQ_ITEMS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
