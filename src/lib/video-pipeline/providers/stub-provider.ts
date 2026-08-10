import type {
  GenerateVideoOutcome,
  GenerateVideoParams,
  ProviderJobStatus,
  VideoProvider,
  VideoProviderId,
} from "./types";

/**
 * 未接続プロバイダ用スタブ。
 * Seedance / Runway / Sora / Luma 接続時に本クラスを差し替え。
 */
export class StubVideoProvider implements VideoProvider {
  readonly id: VideoProviderId;

  constructor(id: VideoProviderId) {
    this.id = id;
  }

  async generateVideo(
    _params: GenerateVideoParams
  ): Promise<GenerateVideoOutcome> {
    const jobId = `stub-${this.id}-${Date.now()}`;
    const error = [
      `${this.id} プロバイダはまだ接続されていません。`,
      "VIDEO_PROVIDER=mock でフロー検証、または接続実装後に VIDEO_PROVIDER を切り替えてください。",
    ].join(" ");

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

  async getStatus(jobId: string): Promise<ProviderJobStatus> {
    return {
      jobId,
      provider: this.id,
      status: "failed",
      providerStatus: "not_connected",
      error: `${this.id} は未接続です`,
      errorCode: "GENERATION_FAILED",
      updatedAt: new Date().toISOString(),
    };
  }
}
