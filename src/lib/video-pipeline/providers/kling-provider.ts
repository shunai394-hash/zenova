/**
 * Kling — 高レベル VideoProvider（クライアント安全）
 *
 * 実 API 呼び出しはサーバー専用:
 *   @/lib/video-pipeline/providers/kling-provider.server
 *
 * UI / 共有バンドルでは未接続スタブとして振る舞い、
 * 実際の Kling 生成は VIDEO_PROVIDER=kling + /api/create-sales-video
 * （@/lib/video-generation）経由で行う。
 */

import { StubVideoProvider } from "./stub-provider";
import type {
  GenerateVideoOutcome,
  GenerateVideoParams,
  ProviderJobStatus,
  VideoProvider,
} from "./types";

export class KlingPipelineProvider implements VideoProvider {
  readonly id = "kling" as const;
  private readonly stub = new StubVideoProvider("kling");

  async generateVideo(
    params: GenerateVideoParams
  ): Promise<GenerateVideoOutcome> {
    if (!process.env.KLING_API_KEY?.trim()) {
      return {
        ok: false,
        result: null,
        provider: this.id,
        jobId: params.jobId?.trim() || `kling-${Date.now()}`,
        status: "failed",
        error:
          "KLING_API_KEY が未設定です。VIDEO_PROVIDER=mock で検証するか、サーバー側 create-sales-video 経由で Kling を利用してください。",
        errorCode: "GENERATION_FAILED",
      };
    }

    // クライアント安全: 実バイト生成は server adapter / sales-video-pipeline に委譲
    return {
      ok: false,
      result: null,
      provider: this.id,
      jobId: params.jobId?.trim() || `kling-${Date.now()}`,
      status: "failed",
      error:
        "Kling の直接 generateVideo はサーバー専用です。/api/create-sales-video を使用するか、getServerVideoProvider() を呼び出してください。",
      errorCode: "GENERATION_FAILED",
    };
  }

  async getStatus(jobId: string): Promise<ProviderJobStatus> {
    return this.stub.getStatus(jobId);
  }
}
