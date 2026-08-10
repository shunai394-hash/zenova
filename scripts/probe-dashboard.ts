/**
 * Dashboard API / Supabase 集計の動作確認
 * Usage: npx tsx scripts/probe-dashboard.ts
 */
import { readFile } from "fs/promises";
import path from "path";

async function loadEnv() {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function main() {
  await loadEnv();

  const { getSalesDashboard } = await import("../src/lib/sales-data/dashboard");
  const payload = await getSalesDashboard({
    recentLimit: 12,
    rankingLimit: 10,
    videoLimit: 12,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        supabase_ok: payload.supabase_ok,
        warnings: payload.warnings,
        totals: payload.totals,
        ranking_count: payload.ranking.length,
        recent_count: payload.recent_products.length,
        video_scores_count: payload.video_scores.length,
        spotlight_count: payload.spotlight.length,
        sample_ranking: payload.ranking.slice(0, 3),
        sample_videos: payload.video_scores.slice(0, 3),
      },
      null,
      2
    )
  );

  // 失敗しても空構造であること（画面破壊防止）
  if (!payload.totals || typeof payload.totals.products !== "number") {
    throw new Error("totals.products missing");
  }
  if (!Array.isArray(payload.ranking)) throw new Error("ranking not array");
  if (!Array.isArray(payload.recent_products)) {
    throw new Error("recent_products not array");
  }
  if (!Array.isArray(payload.video_scores)) {
    throw new Error("video_scores not array");
  }
}

main().catch((err) => {
  console.error("[probe-dashboard] FAILED", err);
  process.exit(1);
});
