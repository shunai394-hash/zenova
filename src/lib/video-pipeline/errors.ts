/**
 * ユーザー向けエラーメッセージ（生成パイプライン）
 */

export type PipelineErrorCode =
  | "NO_URL"
  | "NO_IMAGE"
  | "NO_PRODUCT"
  | "GENERATION_FAILED"
  | "TIMEOUT"
  | "CREDIT_INSUFFICIENT"
  | "RATE_LIMIT"
  | "UNKNOWN";

export const PIPELINE_ERROR_MESSAGES: Record<PipelineErrorCode, string> = {
  NO_URL:
    "商品URLがありません。URLを貼るか、商品名・説明を手動入力してください。",
  NO_IMAGE:
    "商品画像が必要です。画像をアップロードするか、URLから画像を取得してください。",
  NO_PRODUCT: "商品情報が不足しています。商品名と説明を入力してください。",
  GENERATION_FAILED:
    "動画の生成に失敗しました。もう一度お試しいただくか、画像・設定を変えてください。",
  TIMEOUT:
    "生成がタイムアウトしました。時間をおいて再試行するか、尺を短くしてください。",
  CREDIT_INSUFFICIENT:
    "動画生成のクレジットが不足しています。プランを確認するか、時間をおいて再度お試しください。",
  RATE_LIMIT:
    "短時間に連続で生成リクエストがありました。しばらく待ってからお試しください。",
  UNKNOWN: "予期しないエラーが発生しました。もう一度お試しください。",
};

export function getPipelineErrorMessage(
  code: PipelineErrorCode,
  detail?: string | null
): string {
  const base = PIPELINE_ERROR_MESSAGES[code];
  if (detail?.trim() && code !== "UNKNOWN") {
    return `${base}（${detail.trim()}）`;
  }
  if (code === "UNKNOWN" && detail?.trim()) {
    return detail.trim();
  }
  return base;
}

/** 例外 / API 応答からコード推定 */
export function classifyPipelineError(
  error: unknown
): { code: PipelineErrorCode; message: string } {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");
  const lower = raw.toLowerCase();

  if (/画像|image|thumbnail/.test(raw) && /必要|ない|missing|required/.test(raw)) {
    return {
      code: "NO_IMAGE",
      message: getPipelineErrorMessage("NO_IMAGE"),
    };
  }
  if (/url/.test(lower) && /必要|ない|missing|required|空/.test(raw)) {
    return {
      code: "NO_URL",
      message: getPipelineErrorMessage("NO_URL"),
    };
  }
  if (/timeout|タイムアウト|etimedout|aborted/.test(lower)) {
    return {
      code: "TIMEOUT",
      message: getPipelineErrorMessage("TIMEOUT"),
    };
  }
  if (
    /credit|quota|insufficient|402|payment required|残高|クレジット|課金/.test(
      lower
    )
  ) {
    return {
      code: "CREDIT_INSUFFICIENT",
      message: getPipelineErrorMessage("CREDIT_INSUFFICIENT"),
    };
  }
  if (/rate|連続|上限|limit|429/.test(lower)) {
    return {
      code: "RATE_LIMIT",
      message: getPipelineErrorMessage("RATE_LIMIT"),
    };
  }
  if (/生成|generate|failed|失敗|kling|provider|未接続/.test(lower)) {
    return {
      code: "GENERATION_FAILED",
      message: getPipelineErrorMessage("GENERATION_FAILED", raw),
    };
  }

  return {
    code: "UNKNOWN",
    message: getPipelineErrorMessage("UNKNOWN", raw || null),
  };
}

/** 生成前バリデーション */
export function validateBeforeGenerate(input: {
  hasImage: boolean;
  productName: string;
  description: string;
  requireUrl?: boolean;
  hasUrl?: boolean;
}): { ok: true } | { ok: false; code: PipelineErrorCode; message: string } {
  if (!input.hasImage) {
    return {
      ok: false,
      code: "NO_IMAGE",
      message: getPipelineErrorMessage("NO_IMAGE"),
    };
  }
  if (!input.productName.trim() && !input.description.trim()) {
    return {
      ok: false,
      code: "NO_PRODUCT",
      message: getPipelineErrorMessage("NO_PRODUCT"),
    };
  }
  if (input.requireUrl && !input.hasUrl) {
    return {
      ok: false,
      code: "NO_URL",
      message: getPipelineErrorMessage("NO_URL"),
    };
  }
  return { ok: true };
}
