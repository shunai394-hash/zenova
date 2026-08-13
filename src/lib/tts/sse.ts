import type { GenerationStatusEvent } from "./types";

/**
 * SSE の `data: {...}` 行から JSON を取り出す。
 * 素の JSON レスポンスにも対応。
 */
export function parseSseDataPayload(chunk: string): unknown | null {
  const trimmed = chunk.trim();
  if (!trimmed) return null;

  const payload = trimmed.startsWith("data:")
    ? trimmed.slice(5).trim()
    : trimmed;

  if (!payload || payload === "[DONE]") return null;

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
}

export function extractStatusEventsFromText(
  text: string
): GenerationStatusEvent[] {
  const events: GenerationStatusEvent[] = [];
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("data:") || l.startsWith("{"));

    for (const line of lines) {
      const parsed = parseSseDataPayload(line);
      if (!parsed || typeof parsed !== "object") continue;
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.status !== "string") continue;
      events.push({
        id: typeof obj.id === "string" ? obj.id : "",
        status: obj.status,
        duration: typeof obj.duration === "number" ? obj.duration : undefined,
        error: typeof obj.error === "string" ? obj.error : null,
        source: typeof obj.source === "string" ? obj.source : null,
      });
    }
  }

  return events;
}

/**
 * SSE ストリームを読み、completed / failed / cancelled まで待つ。
 */
export async function waitForGenerationStatus(
  response: Response,
  options?: {
    onUpdate?: (event: GenerationStatusEvent) => void;
    signal?: AbortSignal;
  }
): Promise<GenerationStatusEvent> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `生成ステータスの取得に失敗しました (HTTP ${response.status})${
        body ? `: ${body.slice(0, 200)}` : ""
      }`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  // まれに JSON 直返し
  if (contentType.includes("application/json") && response.body) {
    const json = (await response.json()) as GenerationStatusEvent;
    options?.onUpdate?.(json);
    return json;
  }

  if (!response.body) {
    const text = await response.text();
    const events = extractStatusEventsFromText(text);
    const last = events[events.length - 1];
    if (!last) {
      throw new Error("生成ステータスが空です");
    }
    options?.onUpdate?.(last);
    return last;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let lastEvent: GenerationStatusEvent | null = null;

  while (true) {
    if (options?.signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      throw new Error("生成ステータスの監視がキャンセルされました");
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\n\n+/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const events = extractStatusEventsFromText(part);
      for (const event of events) {
        lastEvent = event;
        options?.onUpdate?.(event);
        const status = event.status.toLowerCase();
        if (
          status === "completed" ||
          status === "failed" ||
          status === "cancelled" ||
          status === "canceled"
        ) {
          await reader.cancel().catch(() => undefined);
          return event;
        }
      }
    }
  }

  // 末尾バッファ
  if (buffer.trim()) {
    const events = extractStatusEventsFromText(buffer);
    for (const event of events) {
      lastEvent = event;
      options?.onUpdate?.(event);
    }
  }

  if (!lastEvent) {
    throw new Error("生成ステータスのストリームが終了しました（状態不明）");
  }

  return lastEvent;
}
