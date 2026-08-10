import type {
  GenerateVideoOutcome,
  GenerateVideoParams,
  ProviderJobStatus,
  VideoProvider,
} from "./types";
import { createDummyVideoResult } from "../video-result";

type MockJob = ProviderJobStatus;

const mockJobs = new Map<string, MockJob>();

/**
 * 開発・UI検証用。VIDEO_PROVIDER=mock（デフォルト）
 */
export class MockVideoProvider implements VideoProvider {
  readonly id = "mock" as const;

  async generateVideo(
    params: GenerateVideoParams
  ): Promise<GenerateVideoOutcome> {
    const delay =
      typeof params.options?.mockDelayMs === "number"
        ? params.options.mockDelayMs
        : 800;

    const jobId = params.jobId?.trim() || `mock-${Date.now()}`;
    const now = new Date().toISOString();

    mockJobs.set(jobId, {
      jobId,
      provider: this.id,
      status: "generating",
      providerStatus: "running",
      progress: 10,
      updatedAt: now,
    });

    await new Promise((r) => setTimeout(r, delay));

    const caption = [
      params.analysis?.hook || params.plan.timeline[0]?.text || "",
      params.analysis?.cta ||
        params.plan.timeline[params.plan.timeline.length - 1]?.text ||
        "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = createDummyVideoResult({
      duration: params.plan.duration,
      score: params.analysis?.score ?? 80,
      caption,
      productId: params.product.id,
      thumbnail: params.product.image,
      provider: "mock",
      videoId: jobId,
    });

    const completed: MockJob = {
      jobId,
      provider: this.id,
      status: "completed",
      providerStatus: "succeeded",
      progress: 100,
      result,
      updatedAt: new Date().toISOString(),
    };
    mockJobs.set(jobId, completed);

    return {
      ok: true,
      result,
      provider: this.id,
      jobId,
      status: "completed",
    };
  }

  async getStatus(jobId: string): Promise<ProviderJobStatus> {
    const job = mockJobs.get(jobId);
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
