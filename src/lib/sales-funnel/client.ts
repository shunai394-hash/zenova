"use client";

const SESSION_KEY = "zenova:funnel-session";
const ATTR_KEY = "zenova:funnel-attribution";

function getSessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "anonymous";
  }
}

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  const read = (key: string) => params.get(key)?.trim() || undefined;
  const current = {
    source: read("utm_source"),
    medium: read("utm_medium"),
    campaign: read("utm_campaign"),
    content: read("utm_content"),
  };
  try {
    const saved = JSON.parse(window.localStorage.getItem(ATTR_KEY) || "null");
    const merged = { ...saved, ...Object.fromEntries(Object.entries(current).filter(([,v]) => v)) };
    window.localStorage.setItem(ATTR_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return current;
  }
}

export function trackSalesFunnel(
  event: string,
  metadata: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  const attribution = getAttribution();
  void fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({
      event,
      session_id: getSessionId(),
      path: window.location.pathname,
      ...attribution,
      metadata,
    }),
  }).catch(() => {});
}
