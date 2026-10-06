import { recordSalesFunnelEvent } from "./events";

export function trackGenerationFunnel(input: {
  userId: string;
  event: "video_generation_started" | "video_generation_succeeded" | "video_generation_failed";
  metadata?: Record<string, unknown>;
}) {
  return recordSalesFunnelEvent({
    event: input.event,
    sessionId: input.userId,
    path: "/analyze",
    userId: input.userId,
    metadata: input.metadata ?? {},
  }).catch((error) => {
    console.warn("[sales-funnel]", input.event, error);
  });
}
