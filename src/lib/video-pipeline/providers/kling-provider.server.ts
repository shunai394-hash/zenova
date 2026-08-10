/**
 * Kling サーバー専用アダプタ
 * Node / API Route からのみ import すること（クライアント禁止）
 */

import "server-only";

import { generateAiVideo } from "@/lib/video-generation";
import { createDummyVideoResult } from "../video-result";
import type {
  GenerateVideoOutcome,
  GenerateVideoParams,
  ProviderJobStatus,
  VideoProvider,
} from "./types";

type KlingJob = ProviderJobStatus;
const jobs = new Map<string, KlingJob>();

function buildPrompt(params: GenerateVideoParams): string {
  const scenes = params.plan.timeline
    .map((t) => `${t.second}s ${t.scene}: ${t.text}`)
    .join("; ");
  return [
    `Product: ${params.product.name}.`,
    params.analysis?.hook ? `Hook: ${params.analysis.hook}.` : "",
    `Style: ${params.plan.style}.`,
    scenes ? `Timeline: ${scenes}.` : "",
    "Vertical 9:16 TikTok sales video, natural lighting, no text overlay.",
  ]
    .filter(Boolean)
    .join(" ");
}

export class KlingServerVideoProvider implements VideoProvider {
  readonly id = "kling" as const;

  async generateVideo(
    params: GenerateVideoParams
  ): Promise<GenerateVideoOutcome> {
    const jobId = params.jobId?.trim() || `kling-${Date.now()}`;
    jobs.set(jobId, {
      jobId,
      provider: this.id,
      status: "generating",
      providerStatus: "running",
      progress: 5,
      updatedAt: new Date().toISOString(),
    });

    const imageBase64 = params.imageBase64?.trim();
    if (!imageBase64) {
      const error = "商品画像（imageBase64）が必要です";
      jobs.set(jobId, {
        jobId,
        provider: this.id,
        status: "failed",
        providerStatus: "failed",
        error,
        errorCode: "NO_IMAGE",
        updatedAt: new Date().toISOString(),
      });
      return {
        ok: false,
        result: null,
        provider: this.id,
        jobId,
        status: "failed",
        error,
        errorCode: "NO_IMAGE",
      };
    }

    if (!process.env.KLING_API_KEY?.trim()) {
      const error =
        "KLING_API_KEY が未設定です。VIDEO_PROVIDER=mock を使用してください。";
      jobs.set(jobId, {
        jobId,
        provider: this.id,
        status: "failed",
        providerStatus: "failed",
        error,
        errorCode: "GENERATION_FAILED",
        updatedAt: new Date().toISOString(),
      });
      return {
        ok: false,
        result: null,
        provider: this.id,
        jobId,
        status: "failed",
        error,
        errorCode: "GENERATION_FAILED",
      };
    }

    try {
      const motion =
        params.plan.timeline[0]?.text ||
        params.analysis?.hook ||
        "gentle product showcase";

      const ai = await generateAiVideo({
        imageBase64,
        motion,
        productName: params.product.name,
        durationSec: params.plan.duration,
        provider: "kling",
        promptOverride: buildPrompt(params),
      });

      const videoUrl =
        ai.remoteUrl?.trim() || createDummyVideoResult().videoUrl;

      const caption = [
        params.analysis?.hook || "",
        params.analysis?.cta || "",
      ]
        .filter(Boolean)
        .join("\n");

      const result = {
        videoUrl,
        thumbnail: params.product.image,
        duration: params.plan.duration,
        score: params.analysis?.score ?? 0,
        caption,
        videoId: jobId,
        productId: params.product.id,
        provider: "kling" as const,
      };

      jobs.set(jobId, {
        jobId,
        provider: this.id,
        status: "completed",
        providerStatus: "succeeded",
        progress: 100,
        result,
        updatedAt: new Date().toISOString(),
      });

      return {
        ok: true,
        result,
        provider: this.id,
        jobId,
        status: "completed",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      let errorCode = "GENERATION_FAILED";
      if (/timeout|aborted|etimedout/.test(lower)) errorCode = "TIMEOUT";
      else if (
        /credit|quota|insufficient|402|payment|残高|クレジット/.test(lower)
      ) {
        errorCode = "CREDIT_INSUFFICIENT";
      }

      jobs.set(jobId, {
        jobId,
        provider: this.id,
        status: "failed",
        providerStatus: "failed",
        error: message,
        errorCode,
        updatedAt: new Date().toISOString(),
      });

      return {
        ok: false,
        result: null,
        provider: this.id,
        jobId,
        status: "failed",
        error: message,
        errorCode,
      };
    }
  }

  async getStatus(jobId: string): Promise<ProviderJobStatus> {
    const job = jobs.get(jobId);
    if (!job) {
      return {
        jobId,
        provider: this.id,
        status: "failed",
        providerStatus: "not_found",
        error: "ジョブが見つかりません",
        errorCode: "UNKNOWN",
        updatedAt: new Date().toISOString(),
      };
    }
    return { ...job };
  }
}
