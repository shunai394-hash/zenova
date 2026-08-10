/**
 * 販売シナリオ生成の動作確認
 * Usage: npx tsx scripts/probe-sales-scenario.ts
 */
import { readFile } from "fs/promises";
import path from "path";
import { generateSalesScenario } from "../src/lib/video-scenario";

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
  const scenario = await generateSalesScenario({
    product_name: "ワイヤレスイヤホン",
    description:
      "ランニング中でも外れにくい防水ワイヤレスイヤホン。汗に強く、長時間再生対応。",
    target: "ランニング中にイヤホンが落ちて困る人",
    platform: "TikTok",
    image_name: "earbuds.jpg",
    analysis: {
      summary: "運動用途のフィット感と防水が強みのイヤホン",
      salesAngle: "運動中でも外れにくいイヤホン",
      sellingPoints: ["外れにくい", "防水", "長時間再生"],
      painPoints: ["ランニング中に落ちる", "汗で故障しそう"],
      targetInsight: "運動中の安定装着を最優先する層",
      cta: "今ならチェック",
      recommendedVideoStructure: ["悩み提示", "装着デモ", "商品アップ", "CTA"],
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        elapsed_ms: Date.now() - startedAt,
        scenario,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("[probe-sales-scenario] FAILED", err);
  process.exit(1);
});
