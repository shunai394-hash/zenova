import Groq from "groq-sdk";

/** 既存プロジェクト共通: GROQ_API_KEY（Server 専用） */
export function getGroqApiKey(): string | null {
  const key =
    process.env.GROQ_API_KEY?.trim() || process.env.Groq_API_KEY?.trim();
  return key || null;
}

export function hasGroqApiKey(): boolean {
  return Boolean(getGroqApiKey());
}

export function getGroqClient(): Groq {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY が未設定です");
  }
  return new Groq({ apiKey });
}

/**
 * 既存ルートと揃えたモデル選択。
 * - versatile: 構造化・分析・シナリオ
 * - instant: 短い生成
 */
export function getGroqModel(
  tier: "versatile" | "instant" = "versatile"
): string {
  if (tier === "instant") {
    return (
      process.env.GROQ_MODEL_INSTANT?.trim() || "llama-3.1-8b-instant"
    );
  }
  return (
    process.env.GROQ_MODEL?.trim() ||
    process.env.GROQ_MODEL_VERSATILE?.trim() ||
    "llama-3.3-70b-versatile"
  );
}

export function parseGroqJsonObject(text: string): Record<string, unknown> {
  const raw = (text || "").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error(`Groq JSONのパースに失敗しました: ${raw.slice(0, 180)}`);
  }
}
