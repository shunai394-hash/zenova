import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約 | ZENOVA",
  description: "ZENOVAの利用に関する基本条件をご案内します。",
  robots: { index: true, follow: true },
};

const sections = [
  { title: "第1条（適用）", body: "本規約は、ZENOVAが提供するウェブサイトおよび関連機能（以下「本サービス」）の利用条件を定めるものです。利用者は、本規約に同意したうえで本サービスを利用するものとします。" },
  { title: "第2条（サービスの内容）", body: "本サービスは、商品情報や画像等をもとに、動画制作の企画・台本・生成を支援する機能を提供します。利用できる機能、生成方式、対応形式は、画面上の表示および契約・プランの内容に従います。" },
  { title: "第3条（アカウント管理）", body: "アカウントを利用する場合、利用者は認証情報を適切に管理し、第三者による不正利用を防ぐものとします。アカウント上で行われた操作について、法令上認められる範囲で利用者が責任を負います。" },
  { title: "第4条（入力情報と権利）", body: "利用者は、入力する商品情報、画像、文章、音声その他の素材について、利用に必要な権利・許諾を有していることを確認するものとします。第三者の著作権、商標権、肖像権、プライバシーその他の権利を侵害する素材や、違法な内容を入力してはなりません。" },
  { title: "第5条（生成物の確認）", body: "AIによる生成結果には、不正確な表現、意図しない内容、権利上の問題が含まれる場合があります。利用者は公開・配信・商用利用の前に内容、事実関係、権利、広告表示その他の法令・プラットフォーム規則への適合性を確認するものとします。生成物の独占性や特定の成果は保証されません。" },
  { title: "第6条（禁止事項）", body: "利用者は、法令違反、権利侵害、詐欺・誤認を招く表示、サービスや第三者のシステムへの不正アクセス、過度な負荷を与える行為、セキュリティ機能の回避、他の利用者への迷惑行為を行ってはなりません。" },
  { title: "第7条（停止・変更）", body: "運用上または安全上必要な場合、ZENOVAは本サービスの全部または一部を変更、停止、終了することがあります。可能な場合は、サービス上で事前または事後に案内します。" },
  { title: "第8条（免責と責任）", body: "本サービスは、法令上認められる範囲で現状有姿にて提供されます。利用者の入力、生成結果の利用、外部サービスの障害等に起因する損害について、適用法令で認められる範囲を超えて責任を負うものではありません。本条は、法令により制限できない責任を排除するものではありません。" },
  { title: "第9条（規約の変更）", body: "本規約を変更する場合、変更内容および適用時期を本サービス上など適切な方法で周知します。法令上、利用者の同意が必要な変更については、必要な手続きを行います。" },
  { title: "第10条（準拠法・管轄）", body: "本規約は日本法に準拠します。本サービスに関連して紛争が生じた場合、適用法令に従い解決を図るものとします。" },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#080808] px-5 py-16 text-white sm:px-8 sm:py-24">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-xs tracking-[.18em] text-white/50 transition hover:text-[#d7ff43]">← ZENOVA HOME</Link>
        <p className="mt-12 font-mono text-[10px] tracking-[.28em] text-[#d7ff43]">LEGAL / TERMS</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">利用規約</h1>
        <p className="mt-5 text-sm leading-7 text-white/50">ZENOVAをご利用いただくにあたっての基本条件です。利用前に内容をご確認ください。</p>
        <p className="mt-3 text-xs text-white/35">制定・最終更新日：2026年10月5日</p>
        <div className="mt-10 border-t border-white/10">
          {sections.map((section) => (
            <section key={section.title} className="border-b border-white/10 py-6">
              <h2 className="text-base font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">{section.body}</p>
            </section>
          ))}
        </div>
        <nav className="mt-10 flex flex-wrap gap-5 text-xs text-white/45">
          <Link className="transition hover:text-[#d7ff43]" href="/privacy">プライバシーポリシー</Link>
          <Link className="transition hover:text-[#d7ff43]" href="/">トップページ</Link>
        </nav>
      </article>
    </main>
  );
}
