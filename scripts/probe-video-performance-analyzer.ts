/**
 * 販売動画パフォーマンス評価の動作確認
 * Usage: npx tsx scripts/probe-video-performance-analyzer.ts
 */
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { analyzeVideoPerformance } from "../src/lib/video-performance";

async function loadEnv() {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function pickLargestVideoUrl(): Promise<string | null> {
  const dir = path.join(process.cwd(), "public", "generated", "videos");
  try {
    const files = (await readdir(dir)).filter((f) =>
      f.toLowerCase().endsWith(".mp4")
    );
    if (!files.length) return null;
    const ranked = await Promise.all(
      files.map(async (name) => ({
        name,
        size: (await stat(path.join(dir, name))).size,
      }))
    );
    ranked.sort((a, b) => b.size - a.size);
    return `/generated/videos/${ranked[0].name}`;
  } catch {
    return null;
  }
}

async function main() {
  await loadEnv();

  const video_url = await pickLargestVideoUrl();
  const startedAt = Date.now();

  const result = await analyzeVideoPerformance({
    product_name: "ワイヤレスイヤホン",
    selling_angle: "運動中でも外れにくいイヤホン",
    hook: "ランニング中のイヤホンが外れるストレス、もう終わり。",
    scenes: [
      "走る人がイヤホンを押さえながら困っている",
      "外れないイヤホンを装着して快適に走る",
      "汗をかいても安定して装着されたアップ",
    ],
    cta: "今すぐチェック",
    video_url,
    narration_script:
      "ランニング中のイヤホンが外れるストレス、もう終わり。走る人が困っている。外れないイヤホンで快適に走る。汗をかいても安定。今すぐチェック。",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        elapsed_ms: Date.now() - startedAt,
        video_url,
        result,
      },
      null,
      2
    )
  );

  for (const key of [
    "overall_score",
    "hook_score",
    "product_score",
    "cta_score",
    "tiktok_score",
  ] as const) {
    const v = result[key];
    if (v < 0 || v > 100) throw new Error(`${key} out of range: ${v}`);
  }
  if (!result.next_action_prompt) {
    throw new Error("next_action_prompt empty");
  }
}

main().catch((err) => {
  console.error("[probe-video-performance-analyzer] FAILED", err);
  process.exit(1);
});
