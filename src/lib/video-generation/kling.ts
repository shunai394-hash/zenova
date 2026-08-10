import {
  downloadMp4,
  mapDurationForKling,
  sleep,
  stripDataUrl,
} from "./utils";
import type {
  GenerateVideoInput,
  GenerateVideoResult,
  VideoGenerationProvider,
} from "./types";

const DEFAULT_BASE = "https://api-singapore.klingai.com";

type KlingFailContext = {
  requestUrl: string;
  httpStatus: number | null;
  responseBody: string | null;
  modelName: string;
  taskId: string | null;
  taskStatus: string | null;
  videoUrl: string | null;
  elapsedMs: number;
};

function logKlingFailure(ctx: KlingFailContext): void {
  console.error(
    `[video-provider:kling] FAIL ` +
      `request_url=${ctx.requestUrl} ` +
      `http_status=${ctx.httpStatus ?? "n/a"} ` +
      `model_name=${ctx.modelName} ` +
      `task_id=${ctx.taskId ?? "n/a"} ` +
      `task_status=${ctx.taskStatus ?? "n/a"} ` +
      `video_url=${ctx.videoUrl ?? "n/a"} ` +
      `elapsed_ms=${ctx.elapsedMs} ` +
      `response_body=${ctx.responseBody ?? "n/a"}`
  );
}

/**
 * Kling AI image-to-video（実API・Singapore）
 *
 * - Auth: Authorization: Bearer ${KLING_API_KEY}（JWT は使わない）
 * - Base: https://api-singapore.klingai.com
 * - Create: POST /v1/videos/image2video
 * - Poll:   GET  /v1/videos/image2video/{task_id}
 */
export class KlingVideoProvider implements VideoGenerationProvider {
  readonly id = "kling" as const;

  private getAuthorization(): string {
    const key = process.env.KLING_API_KEY?.trim();
    if (!key) {
      throw new Error(
        "KLING_API_KEY が未設定です。Kling 実APIには API Key が必要です。"
      );
    }
    return `Bearer ${key.replace(/^Bearer\s+/i, "")}`;
  }

  private getBaseUrl(): string {
    return (
      process.env.KLING_API_BASE?.replace(/\/$/, "") || DEFAULT_BASE
    );
  }

  async generate(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    const startedAt = Date.now();
    const base = this.getBaseUrl();
    const model = process.env.KLING_MODEL || "kling-v1-6";
    const duration = mapDurationForKling(input.durationSec);
    const image = stripDataUrl(input.imageBase64);
    const mode = process.env.KLING_MODE || "std";
    const createUrl = `${base}/v1/videos/image2video`;

    let taskId: string | null = null;
    let taskStatus: string | null = null;
    let videoUrl: string | null = null;

    const requestBody = {
      model_name: model,
      image,
      prompt: input.prompt.slice(0, 2500),
      duration,
      mode,
      aspect_ratio: "9:16",
    };

    console.log(
      `[video-provider:kling] create request_url=${createUrl} ` +
        `model_name=${model} duration=${duration} mode=${mode} ` +
        `image_chars=${image.length}`
    );

    let createRes: Response;
    let createText: string;
    try {
      createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: this.getAuthorization(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      createText = await createRes.text();
    } catch (error) {
      logKlingFailure({
        requestUrl: createUrl,
        httpStatus: null,
        responseBody: error instanceof Error ? error.message : String(error),
        modelName: model,
        taskId,
        taskStatus,
        videoUrl,
        elapsedMs: Date.now() - startedAt,
      });
      throw error;
    }

    let createJson: Record<string, unknown> = {};
    try {
      createJson = JSON.parse(createText) as Record<string, unknown>;
    } catch {
      createJson = { raw: createText.slice(0, 500) };
    }

    if (!createRes.ok || createJson?.code !== 0) {
      logKlingFailure({
        requestUrl: createUrl,
        httpStatus: createRes.status,
        responseBody: createText.slice(0, 2000),
        modelName: model,
        taskId,
        taskStatus,
        videoUrl,
        elapsedMs: Date.now() - startedAt,
      });
      throw new Error(
        `Kling create failed (HTTP ${createRes.status}): ${
          (createJson?.message as string) || createText.slice(0, 300)
        }`
      );
    }

    const data = createJson?.data as Record<string, unknown> | undefined;
    const task =
      data && typeof data === "object"
        ? (data.task as Record<string, unknown> | undefined)
        : undefined;
    const resolvedTaskId = data?.task_id || task?.id || createJson?.task_id;
    taskId = resolvedTaskId ? String(resolvedTaskId) : null;

    if (!taskId) {
      logKlingFailure({
        requestUrl: createUrl,
        httpStatus: createRes.status,
        responseBody: createText.slice(0, 2000),
        modelName: model,
        taskId,
        taskStatus,
        videoUrl,
        elapsedMs: Date.now() - startedAt,
      });
      throw new Error("Kling: task_id が返りませんでした");
    }

    console.log(
      `[video-provider:kling] created task_id=${taskId} model_name=${model}`
    );

    try {
      videoUrl = await this.pollUntilReady({
        base,
        taskId,
        modelName: model,
        startedAt,
        onStatus: (status) => {
          taskStatus = status;
        },
      });
    } catch (error) {
      // pollUntilReady 内で既に詳細ログ済みの場合もあるが、最終状態を再出力
      logKlingFailure({
        requestUrl: `${base}/v1/videos/image2video/${taskId}`,
        httpStatus: null,
        responseBody: error instanceof Error ? error.message : String(error),
        modelName: model,
        taskId,
        taskStatus,
        videoUrl,
        elapsedMs: Date.now() - startedAt,
      });
      throw error;
    }

    let videoBytes: Buffer;
    try {
      videoBytes = await downloadMp4(videoUrl);
    } catch (error) {
      logKlingFailure({
        requestUrl: videoUrl,
        httpStatus: null,
        responseBody: error instanceof Error ? error.message : String(error),
        modelName: model,
        taskId,
        taskStatus: "succeed",
        videoUrl,
        elapsedMs: Date.now() - startedAt,
      });
      throw error;
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(
      `[video-provider:kling] done request_url=${createUrl} ` +
        `http_status=200 model_name=${model} task_id=${taskId} ` +
        `task_status=succeed video_url=${videoUrl} ` +
        `bytes=${videoBytes.length} elapsed_ms=${elapsedMs}`
    );

    return {
      videoBytes,
      provider: this.id,
      model,
      remoteUrl: videoUrl,
      meta: {
        taskId,
        taskStatus: "succeed",
        duration,
        mode,
        elapsedMs,
      },
    };
  }

  private async pollUntilReady(input: {
    base: string;
    taskId: string;
    modelName: string;
    startedAt: number;
    onStatus: (status: string | null) => void;
  }): Promise<string> {
    const maxAttempts = 60;
    let delayMs = 3000;
    const pollUrl = `${input.base}/v1/videos/image2video/${input.taskId}`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(delayMs);

      let res: Response;
      let text: string;
      try {
        res = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: this.getAuthorization(),
            Accept: "application/json",
          },
        });
        text = await res.text();
      } catch (error) {
        logKlingFailure({
          requestUrl: pollUrl,
          httpStatus: null,
          responseBody: error instanceof Error ? error.message : String(error),
          modelName: input.modelName,
          taskId: input.taskId,
          taskStatus: null,
          videoUrl: null,
          elapsedMs: Date.now() - input.startedAt,
        });
        throw error;
      }

      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = { raw: text.slice(0, 500) };
      }

      if (!res.ok || (json?.code !== undefined && json.code !== 0)) {
        logKlingFailure({
          requestUrl: pollUrl,
          httpStatus: res.status,
          responseBody: text.slice(0, 2000),
          modelName: input.modelName,
          taskId: input.taskId,
          taskStatus: null,
          videoUrl: null,
          elapsedMs: Date.now() - input.startedAt,
        });
        throw new Error(
          `Kling poll failed (HTTP ${res.status}): ${
            (json?.message as string) || text.slice(0, 300)
          }`
        );
      }

      const data = json?.data as Record<string, unknown> | undefined;
      const task =
        data && typeof data === "object"
          ? (data.task as Record<string, unknown> | undefined)
          : undefined;
      const statusRaw = data?.task_status || task?.status || json?.task_status;
      const status = statusRaw != null ? String(statusRaw) : null;
      input.onStatus(status);

      console.log(
        `[video-provider:kling] poll request_url=${pollUrl} ` +
          `http_status=${res.status} model_name=${input.modelName} ` +
          `task_id=${input.taskId} task_status=${status ?? "unknown"} ` +
          `attempt=${attempt + 1} elapsed_ms=${Date.now() - input.startedAt}`
      );

      if (status === "succeed" || status === "success" || status === "completed") {
        const taskResult = data?.task_result as
          | Record<string, unknown>
          | undefined;
        const videos = taskResult?.videos as
          | Array<Record<string, unknown>>
          | undefined;
        const url = videos?.[0]?.url;

        if (typeof url === "string" && url.startsWith("http")) {
          return url;
        }

        logKlingFailure({
          requestUrl: pollUrl,
          httpStatus: res.status,
          responseBody: text.slice(0, 2000),
          modelName: input.modelName,
          taskId: input.taskId,
          taskStatus: status,
          videoUrl: typeof url === "string" ? url : null,
          elapsedMs: Date.now() - input.startedAt,
        });
        throw new Error(
          "Kling: succeed だが task_result.videos[0].url がありません"
        );
      }

      if (status === "failed" || status === "fail" || status === "error") {
        logKlingFailure({
          requestUrl: pollUrl,
          httpStatus: res.status,
          responseBody: text.slice(0, 2000),
          modelName: input.modelName,
          taskId: input.taskId,
          taskStatus: status,
          videoUrl: null,
          elapsedMs: Date.now() - input.startedAt,
        });
        const msg = data?.task_status_msg || json?.message || "unknown";
        throw new Error(`Kling generation failed: ${String(msg)}`);
      }

      delayMs = Math.min(15000, Math.floor(delayMs * 1.35));
    }

    logKlingFailure({
      requestUrl: pollUrl,
      httpStatus: null,
      responseBody: "timeout waiting for succeed",
      modelName: input.modelName,
      taskId: input.taskId,
      taskStatus: null,
      videoUrl: null,
      elapsedMs: Date.now() - input.startedAt,
    });
    throw new Error("Kling: タイムアウト（動画生成が完了しませんでした）");
  }
}
