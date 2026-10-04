import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | ZENOVA",
  description: "ZENOVAにおける個人情報・利用データの取り扱いについて。",
  robots: { index: true, follow: true },
};

const sections = [
  { title: "1. 取得する情報", body: "本サービスでは、アカウント登録・認証に関する情報、利用者が入力する商品URL・画像・文章等、生成履歴や操作記録、問い合わせ時に利用者が送信する情報、および安全性・稼働状況の確認に必要な技術情報を取得する場合があります。実際に取得する情報は、利用する機能や設定によって異なります。" },
  { title: "2. 利用目的", body: "取得した情報は、本人確認とアカウント管理、動画制作機能の提供、生成処理・履歴の管理、不正利用の防止、障害対応と品質改善、問い合わせへの対応、および法令上の義務を履行するために利用します。" },
  { title: "3. 外部サービスへの送信", body: "生成機能や認証等を提供するため、利用者が選択した機能に応じて、入力情報の一部がAIモデル提供者、認証・データベース基盤、動画生成基盤その他の外部サービスに送信される場合があります。各外部サービスの処理は、その提供者の規約・プライバシーポリシーにも従います。機密情報や第三者の個人情報を入力する場合は、送信先と利用条件を確認してください。" },
  { title: "4. 第三者提供・委託", body: "法令に基づく場合等を除き、本人の同意なく個人データを第三者へ提供しません。サービス運営に必要な範囲で取扱いを委託する場合、委託先を適切に選定・監督します。" },
  { title: "5. 保存と安全管理", body: "取得した情報は、利用目的の達成に必要な期間または法令上必要な期間保存し、不要となった情報は適切な方法で削除または匿名化するよう努めます。不正アクセス、漏えい、改ざん等を防ぐため、合理的な安全管理措置を講じます。" },
  { title: "6. Cookie等", body: "ログイン状態の維持、設定の保存、セキュリティ確保、利用状況の把握等のため、Cookieその他の類似技術を利用する場合があります。ブラウザの設定によりCookieを制限できますが、一部機能が利用できなくなることがあります。" },
  { title: "7. 利用者の権利", body: "適用される法令に基づき、保有個人データの開示、訂正、利用停止、削除等を請求できる場合があります。本人確認のうえ、法令に従って対応します。" },
  { title: "8. 未成年者の利用", body: "未成年者が本サービスを利用する場合、必要に応じて保護者等の同意を得てください。" },
  { title: "9. 本ポリシーの変更", body: "法令やサービス内容の変更に応じて本ポリシーを改定することがあります。重要な変更は、本サービス上など適切な方法で周知します。" },
  { title: "10. お問い合わせ", body: "個人情報の取り扱いに関するお問い合わせや請求は、本サービス内で案内されるサポート窓口を通じてご連絡ください。窓口が表示されない場合は、サービス提供者が指定する正式な連絡先の公開を確認したうえでご連絡ください。" },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#080808] px-5 py-16 text-white sm:px-8 sm:py-24">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-xs tracking-[.18em] text-white/50 transition hover:text-[#d7ff43]">← ZENOVA HOME</Link>
        <p className="mt-12 font-mono text-[10px] tracking-[.28em] text-[#d7ff43]">LEGAL / PRIVACY</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">プライバシーポリシー</h1>
        <p className="mt-5 text-sm leading-7 text-white/50">本サービスで取り扱う情報と、その利用目的・管理について説明します。</p>
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
          <Link className="transition hover:text-[#d7ff43]" href="/terms">利用規約</Link>
          <Link className="transition hover:text-[#d7ff43]" href="/">トップページ</Link>
        </nav>
      </article>
    </main>
  );
}
