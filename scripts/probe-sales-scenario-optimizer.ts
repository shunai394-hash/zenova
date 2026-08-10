/**
 * 販売シナリオ最適化の動作確認
 * Usage: npx tsx scripts/probe-sales-scenario-optimizer.ts
 */
import { readFile } from "fs/promises";
import path from "path";
import { optimizeSalesScenario } from "../src/lib/video-scenario";

async function loadEnv() {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function main() {
  await loadEnv();

  const startedAt = Date.now();
  const result = await optimizeSalesScenario({
    product_name: "ワイヤレスイヤホン",
    description:
      "ランニング中でも外れにくい防水ワイヤレスイヤホン。汗に強く、長時間再生対応。",
    target_customer: "ランニング中にイヤホンが落ちて困る人",
    selling_angle: "防水IPX7対応のワイヤレスイヤホン",
    hook: "おすすめイヤホンです",
    scene_1: "商品の写真",
    scene_2: "イヤホンのアップ",
    scene_3: "パッケージのアップ",
    cta: "詳細はこちら",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        elapsed_ms: Date.now() - startedAt,
        result,
      },
      null,
      2
    )
  );

  if (result.score < 0 || result.score > 100) {
    throw new Error(`score out of range: ${result.score}`);
  }
  if (!result.optimized_kling_prompt.startsWith("Create a vertical")) {
    throw new Error("optimized_kling_prompt format unexpected");
  }
}

main().catch((err) => {
  console.error("[probe-sales-scenario-optimizer] FAILED", err);
  process.exit(1);
});
