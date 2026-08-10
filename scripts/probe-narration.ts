/**
 * ElevenLabs ナレーション動作確認
 * Usage: npx tsx scripts/probe-narration.ts
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

  const { generateSalesNarration } = await import(
    "../src/lib/voice-narration"
  );

  const startedAt = Date.now();
  const result = await generateSalesNarration({
    product_name: "ワイヤレスイヤホン",
    optimized_hook: "ランニング中のイヤホンが外れるストレス、もう終わり。",
    optimized_scene_1: "走る人がイヤホンを押さえながら困っている",
    optimized_scene_2: "同じ人が外れないイヤホンを装着して快適に走る",
    optimized_scene_3: "汗をかいても安定して装着されたイヤホンのアップ",
    optimized_cta: "今すぐチェック",
    generate_audio: true,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        elapsed_ms: Date.now() - startedAt,
        audio_url: result.audio_url,
        voice_provider: result.voice_provider,
        voice_id: result.voice_id,
        bytes: result.bytes,
        skipped: result.skipped,
        skip_reason: result.skip_reason,
        script: result.script,
      },
      null,
      2
    )
  );

  if (!result.script) {
    throw new Error("script is empty");
  }
}

main().catch((err) => {
  console.error("[probe-narration] FAILED", err);
  process.exit(1);
});
