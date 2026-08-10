import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  downloadMp4,
  getPublicBaseUrl,
  logProviderHttpFailure,
  mapDurationForLuma,
  sleep,
  stripDataUrl,
} from "./utils";
import type {
  GenerateVideoInput,
  GenerateVideoResult,
  VideoGenerationProvider,
} from "./types";

/**
 * Luma Dream Machine image-to-video（実API）
 *
 * 環境変数:
 * - LUMA_API_KEY（必須）
 * - LUMA_API_BASE（default: https://api.lumalabs.ai）
 * - LUMA_MODEL（default: ray-2）
 * - LUMA_PUBLIC_BASE_URL または NEXT_PUBLIC_SITE_URL
 *   （Lumaは画像URL必須。ローカルhostは不可のため公開URLが必要）
 */
export class LumaVideoProvider implements VideoGenerationProvider {
  readonly id = "luma" as const;

  async generate(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    const apiKey = process.env.LUMA_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("LUMA_API_KEY が設定されていません");
    }

    const base =
      process.env.LUMA_API_BASE?.replace(/\/$/, "") ||
      "https://api.lumalabs.ai";
    const model = process.env.LUMA_MODEL || "ray-2";
    const duration = mapDurationForLuma(input.durationSec);
    const imageUrl = await this.ensurePublicImageUrl(input.imageBase64);
    const createUrl = `${base}/dream-machine/v1/generations`;

    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: input.prompt,
        model,
        aspect_ratio: "9:16",
        duration,
        keyframes: {
          frame0: {
            type: "image",
            url: imageUrl,
          },
        },
      }),
    });

    const createText = await createRes.text();
    let createJson: Record<string, unknown> = {};
    try {
      createJson = JSON.parse(createText) as Record<string, unknown>;
    } catch {
      createJson = { raw: createText.slice(0, 500) };
    }

    if (!createRes.ok) {
      logProviderHttpFailure({
        provider: "luma",
        step: "create_generation",
        method: "POST",
        url: createUrl,
        status: createRes.status,
        body: createText.slice(0, 800),
      });
      throw new Error(
        `Luma create failed (HTTP ${createRes.status}): ${
          (createJson?.detail as string) ||
          (createJson?.failure_reason as string) ||
          createText.slice(0, 300)
        }`
      );
    }

    const generationId = createJson?.id;
    if (!generationId) {
      logProviderHttpFailure({
        provider: "luma",
        step: "create_missing_id",
        method: "POST",
        url: createUrl,
        status: createRes.status,
        body: createText.slice(0, 800),
      });
      throw new Error("Luma: generation id が返りませんでした");
    }

    const videoUrl = await this.pollUntilReady(
      base,
      apiKey,
      String(generationId)
    );
    const videoBytes = await downloadMp4(videoUrl);

    return {
      videoBytes,
      provider: this.id,
      model,
      remoteUrl: videoUrl,
      meta: {
        generationId,
        duration,
        aspect_ratio: "9:16",
        imageUrl,
      },
    };
  }

  private async ensurePublicImageUrl(imageBase64: string): Promise<string> {
    const publicBase = getPublicBaseUrl();
    if (!publicBase) {
      throw new Error(
        "Luma は公開画像URLが必要です。LUMA_PUBLIC_BASE_URL または NEXT_PUBLIC_SITE_URL を設定してください。"
      );
    }

    if (
      publicBase.includes("localhost") ||
      publicBase.includes("127.0.0.1")
    ) {
      throw new Error(
        "Luma は localhost 画像URLを取得できません。公開可能な LUMA_PUBLIC_BASE_URL を設定してください。"
      );
    }

    const dir = path.join(process.cwd(), "public", "generated", "images");
    await mkdir(dir, { recursive: true });
    const filename = `luma-src-${Date.now()}-${randomUUID().slice(0, 8)}.png`;
    const filepath = path.join(dir, filename);
    await writeFile(filepath, Buffer.from(stripDataUrl(imageBase64), "base64"));

    return `${publicBase}/generated/images/${filename}`;
  }

  private async pollUntilReady(
    base: string,
    apiKey: string,
    generationId: string
  ): Promise<string> {
    const maxAttempts = 60;
    let delayMs = 3000;
    const pollUrl = `${base}/dream-machine/v1/generations/${generationId}`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(delayMs);

      const res = await fetch(pollUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });

      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = { raw: text.slice(0, 500) };
      }

      if (!res.ok) {
        logProviderHttpFailure({
          provider: "luma",
          step: `poll_generation_attempt_${attempt + 1}`,
          method: "GET",
          url: pollUrl,
          status: res.status,
          body: text.slice(0, 800),
        });
        throw new Error(
          `Luma poll failed (HTTP ${res.status}): ${text.slice(0, 300)}`
        );
      }

      const state = String(json?.state || "").toLowerCase();

      if (state === "completed") {
        const assets = json?.assets as Record<string, unknown> | undefined;
        const url = assets?.video;
        if (typeof url === "string" && url.startsWith("http")) {
          return url;
        }
        logProviderHttpFailure({
          provider: "luma",
          step: "poll_missing_video_url",
          method: "GET",
          url: pollUrl,
          status: res.status,
          body: text.slice(0, 800),
        });
        throw new Error("Luma: completed だが assets.video がありません");
      }

      if (state === "failed" || state === "error") {
        logProviderHttpFailure({
          provider: "luma",
          step: "generation_failed",
          method: "GET",
          url: pollUrl,
          status: res.status,
          body: text.slice(0, 800),
        });
        throw new Error(
          `Luma generation failed: ${json?.failure_reason || "unknown"}`
        );
      }

      delayMs = Math.min(15000, Math.floor(delayMs * 1.35));
    }

    throw new Error("Luma: タイムアウト（動画生成が完了しませんでした）");
  }
}
