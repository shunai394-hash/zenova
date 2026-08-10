/**
 * create-sales-video E2E（ワイヤレスイヤホン）
 * Usage: npx tsx scripts/probe-create-sales-video.ts
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

async function fetchTestImageBase64(): Promise<string> {
  const url = "https://picsum.photos/512/768";
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`image download failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

async function main() {
  await loadEnv();

  const { runCreateSalesVideo } = await import(
    "../src/lib/sales-video-pipeline"
  );

  const image = await fetchTestImageBase64();
  console.log("[probe] image_chars=", image.length);
  console.log("[probe] start create-sales-video (earbuds)");

  const result = await runCreateSalesVideo({
    product_name: "ワイヤレスイヤホン",
    description:
      "ランニング中でも外れにくい防水ワイヤレスイヤホン。汗に強く、長時間再生対応。",
    target: "ランニング中にイヤホンが落ちて困る人",
    platform: "TikTok",
    image,
    duration_sec: 5,
  });

  console.log(
    JSON.stringify(
      {
        success: result.success,
        product_id: result.product_id,
        scenario_id: result.scenario_id,
        video_id: result.video_id,
        video_url: result.video_url,
        audio_url: result.audio_url,
        score: result.score,
        selling_angle: result.selling_angle,
        hook: result.hook,
        steps: result.steps,
        provider: result.provider,
        warnings: result.warnings,
        elapsed_ms: result.elapsed_ms,
      },
      null,
      2
    )
  );

  if (!result.success) {
    throw new Error("pipeline success=false");
  }
  if (!result.steps.analysis || !result.steps.scenario || !result.steps.kling) {
    throw new Error("required steps failed");
  }
  if (!result.video_url) {
    throw new Error("video_url missing");
  }
}

main().catch((err) => {
  console.error("[probe-create-sales-video] FAILED", err);
  process.exit(1);
});
