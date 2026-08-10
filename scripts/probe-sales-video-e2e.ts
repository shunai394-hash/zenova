/**
 * E2E: 商品分析 → 販売シナリオ → create-ai-video（kling_prompt）
 * Usage: npx tsx scripts/probe-sales-video-e2e.ts
 */
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

async function loadEnv() {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function fetchTestImageBase64(): Promise<string> {
  const url = "https://picsum.photos/512/768";
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`image download failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

async function main() {
  await loadEnv();

  // env 読み込み後に動的 import（supabase 初期化対策）
  const { analyzeProduct } = await import("../src/lib/product-analysis/engine");
  const { generateSalesScenario } = await import("../src/lib/video-scenario");
  const { generateAiVideo, resolveProviderId } = await import(
    "../src/lib/video-generation"
  );

  const product = {
    product_name: "ワイヤレスイヤホン",
    description:
      "ランニング中でも外れにくい防水ワイヤレスイヤホン。汗に強く、長時間再生対応。",
    target: "ランニング中にイヤホンが落ちて困る人",
    platform: "TikTok",
  };

  console.log("[e2e] 1) analyze-product");
  const analysis = await analyzeProduct({
    ...product,
    image_name: "earbuds.jpg",
    source: "manual",
  });
  console.log("[e2e] salesAngle=", analysis.salesAngle);
  console.log(
    "[e2e] salesScore=",
    analysis.salesScore.total,
    analysis.salesScore.grade
  );

  console.log("[e2e] 2) generate-sales-scenario");
  const scenario = await generateSalesScenario({
    ...product,
    image_name: "earbuds.jpg",
    analysis: {
      summary: analysis.summary,
      salesAngle: analysis.salesAngle,
      sellingPoints: analysis.sellingPoints,
      painPoints: analysis.painPoints,
      targetInsight: analysis.targetInsight,
      cta: analysis.cta,
      recommendedVideoStructure: analysis.recommendedVideoStructure,
    },
  });
  console.log("[e2e] selling_angle=", scenario.selling_angle);
  console.log("[e2e] hook=", scenario.hook_0_2sec);
  console.log(
    "[e2e] kling_prompt=",
    scenario.kling_prompt.slice(0, 120) + "..."
  );

  console.log("[e2e] 3) create-ai-video (promptOverride=kling_prompt)");
  const imageBase64 = await fetchTestImageBase64();
  const provider = resolveProviderId(null);
  console.log("[e2e] resolved_provider=", provider);

  const startedAt = Date.now();
  const result = await generateAiVideo({
    imageBase64,
    motion: scenario.hook_0_2sec,
    productName: product.product_name,
    durationSec: 5,
    provider: null,
    promptOverride: scenario.kling_prompt,
  });

  const dir = path.join(process.cwd(), "public", "generated", "videos");
  await mkdir(dir, { recursive: true });
  const filename = `zenova-sales-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`;
  await writeFile(path.join(dir, filename), result.videoBytes);

  const isMock = result.provider === "mock";
  const response = {
    video_url: `/generated/videos/${filename}`,
    filename,
    provider: result.provider,
    used_real_api: !isMock,
    is_mock: isMock,
    prompt: result.prompt,
    scenario_used: true,
    selling_angle: scenario.selling_angle,
    hook: scenario.hook_0_2sec,
    remote_url: result.remoteUrl ?? null,
    bytes: result.videoBytes.length,
    elapsed_ms: Date.now() - startedAt,
    meta: result.meta ?? null,
  };

  console.log("[e2e] 4) done");
  console.log(JSON.stringify(response, null, 2));

  if (result.prompt !== scenario.kling_prompt.slice(0, 2500)) {
    throw new Error("prompt が kling_prompt と一致しません");
  }
}

main().catch((err) => {
  console.error("[e2e] FAILED", err);
  process.exit(1);
});
