/**
 * Supabase 販売データ接続・テーブル確認
 * Usage: npx tsx scripts/probe-sales-data-supabase.ts
 *
 * 事前に migration を適用:
 *   supabase/migrations/20260711000000_sales_data_tables.sql
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  console.log("[probe] SUPABASE_URL=", url ? `set(len=${url.length})` : "MISSING");
  console.log(
    "[probe] SUPABASE_KEY=",
    key ? `set(len=${key.length})` : "MISSING"
  );

  if (!url || !key) {
    throw new Error("Supabase env missing");
  }

  const {
    probeSalesDataConnection,
    ensureProductRow,
    saveSalesScenario,
    saveGeneratedVideo,
  } = await import("../src/lib/sales-data");

  const status = await probeSalesDataConnection();
  console.log("[probe] connection=", JSON.stringify(status, null, 2));

  if (!status.ok) {
    console.error(
      "[probe] tables missing. Apply this SQL in Supabase SQL Editor:\n" +
        "  supabase/migrations/20260711000000_sales_data_tables.sql"
    );
    process.exit(2);
  }

  const productId = await ensureProductRow({
    product_name: `probe-earbuds-${Date.now()}`,
    description: "Supabase probe product",
    category: "ガジェット",
    platform: "TikTok",
    target: "probe",
  });
  console.log("[probe] product_id=", productId);

  const scenario = await saveSalesScenario({
    product_id: productId,
    hook: "probe hook",
    selling_angle: "probe angle",
    scene_1: "s1",
    scene_2: "s2",
    scene_3: "s3",
    cta: "check",
    kling_prompt: "Create a vertical TikTok commercial video showing probe",
    target_customer: "probe user",
  });
  console.log("[probe] scenario_id=", scenario.id);

  const video = await saveGeneratedVideo({
    product_id: productId,
    video_url: "/generated/videos/probe.mp4",
    audio_url: "/generated/audio/probe.mp3",
    score: 80,
    hook_score: 85,
    product_score: 80,
    cta_score: 75,
    tiktok_score: 80,
    scenario_id: scenario.id,
    narration_script: "probe narration",
  });
  console.log("[probe] generated_video_id=", video.id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        product_id: productId,
        scenario_id: scenario.id,
        generated_video_id: video.id,
        tables: status.details,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("[probe-sales-data-supabase] FAILED", err);
  process.exit(1);
});
