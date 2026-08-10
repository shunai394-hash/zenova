import Link from "next/link";
import type { DiscoveryProduct } from "@/lib/product-discovery";
import {
  formatAffiliateRatePercent,
  formatCategoryBadge,
  splitNameAndCategory,
} from "@/lib/product-discovery";

function formatYen(value: number | null): string {
  if (value == null) return "—";
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function ProductCard({ product }: { product: DiscoveryProduct }) {
  const score = Math.max(0, Math.min(100, product.sales_score ?? 0));
  const { name, category } = splitNameAndCategory(
    product.name,
    product.category
  );
  const categoryBadge = formatCategoryBadge(category);

  return (
    <article className="flex w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 sm:w-auto">
      <div className="relative aspect-[4/3] bg-zinc-950">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-600">
            No Image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {name}
        </h3>

        {categoryBadge && (
          <span className="mt-2 inline-flex w-fit rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-gray-300">
            {categoryBadge}
          </span>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500">価格</p>
            <p className="mt-0.5 font-medium text-gray-200">
              {formatYen(product.price)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">報酬率</p>
            <p className="mt-0.5 font-medium text-emerald-400">
              {formatAffiliateRatePercent(product.affiliate_rate)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">利益</p>
            <p className="mt-0.5 font-medium text-gray-200">
              {formatYen(product.estimated_profit)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">スコア</p>
            <p className="mt-0.5 font-medium text-gray-200">
              {product.sales_score ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-gray-500">
            <span>売れる可能性</span>
            <span>{score}/100</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {product.sell_reason && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-400">
            {product.sell_reason}
          </p>
        )}

        <Link
          href={`/analyze?product=${encodeURIComponent(product.id)}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-gray-100"
        >
          この商品で動画を作る
        </Link>
        <Link
          href={`/products/${product.id}`}
          className="mt-2 inline-flex w-full items-center justify-center rounded border border-zinc-700 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-zinc-800"
        >
          商品詳細を見る
        </Link>
      </div>
    </article>
  );
}
