import type { VideoPreviewPayload } from "@/lib/analyze/preview-session";

export type PreviewEvalScores = {
  /** フック力 0–100 */
  hookPower: number;
  /** 視聴維持予測 0–100 */
  retentionPredict: number;
  /** 購買誘導 0–100 */
  purchaseGuide: number;
};

export type PreviewChecklistItem = {
  id: "vertical" | "duration" | "cta" | "product";
  label: string;
  ok: boolean;
  detail: string;
};

export type ImproveKind = "hook" | "cta" | "tiktok";

export type ImproveSuggestion = {
  kind: ImproveKind;
  label: string;
  before: string;
  after: string;
  tip: string;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * 生成動画の簡易評価（テキスト情報ベースの予測スコア）
 */
export function evaluatePreviewVideo(
  payload: VideoPreviewPayload
): PreviewEvalScores & { summary: string } {
  const hook = (payload.hook || "").trim();
  const structure = (payload.structure || "").trim();
  const cta = (payload.cta || "").trim();
  const duration = payload.durationSec ?? 15;
  const score = typeof payload.score === "number" ? payload.score : 70;

  let hookPower = 45;
  if (hook.length >= 10) hookPower += 15;
  if (/[？?]/.test(hook) || /正直|知らない|これ/.test(hook)) hookPower += 15;
  if (hook.length >= 20) hookPower += 8;
  hookPower = clamp(hookPower * 0.5 + score * 0.5);

  let retention = 50;
  const beats = structure.split("\n").filter(Boolean).length;
  if (beats >= 3) retention += 15;
  if (beats >= 4) retention += 8;
  if (duration >= 15 && duration <= 30) retention += 12;
  else if (duration > 45) retention -= 10;
  if (payload.captionsEnabled) retention += 8;
  retention = clamp(retention * 0.55 + score * 0.45);

  let purchase = 40;
  if (cta.length >= 8) purchase += 20;
  if (/リンク|プロフ|チェック|公式/.test(cta)) purchase += 15;
  if (payload.sellingAngle) purchase += 8;
  if ((payload.productName || payload.title || "").length > 0) purchase += 7;
  purchase = clamp(purchase * 0.5 + score * 0.5);

  const avg = Math.round((hookPower + retention + purchase) / 3);
  const summary =
    avg >= 80
      ? "投稿できる完成度です。チェックリストを確認して投稿へ進めます。"
      : avg >= 65
        ? "まずまずの完成度です。AI改善でフックかCTAを磨くと伸びやすくなります。"
        : "改善余地があります。冒頭3秒とCTAから直すのが効果的です。";

  return { hookPower, retentionPredict: retention, purchaseGuide: purchase, summary };
}

/**
 * 投稿前チェックリスト
 */
export function buildPostChecklist(
  payload: VideoPreviewPayload
): PreviewChecklistItem[] {
  const duration = payload.durationSec ?? 0;
  const cta = (payload.cta || "").trim();
  const product =
    (payload.productDescription || "").trim() ||
    (payload.productName || "").trim() ||
    (payload.title || "").trim();
  const structure = (payload.structure || "").trim();

  // Zenova生成は縦型想定。明示フラグがなければOK扱い
  const verticalOk = payload.isVertical !== false;

  const durationOk = duration > 0 && duration <= 60;
  const ctaOk = cta.length >= 6 || /CTA|プロフ|リンク/.test(structure);
  const productOk = product.length >= 2;

  return [
    {
      id: "vertical",
      label: "縦動画",
      ok: verticalOk,
      detail: verticalOk
        ? "TikTok向けの縦型（9:16想定）で生成されています"
        : "縦型に再生成してください",
    },
    {
      id: "duration",
      label: "尺",
      ok: durationOk,
      detail: durationOk
        ? `約${duration}秒 — 短尺として扱いやすい長さです`
        : duration
          ? `${duration}秒は長めです。15〜30秒への再生成を推奨`
          : "尺情報がありません",
    },
    {
      id: "cta",
      label: "CTA",
      ok: ctaOk,
      detail: ctaOk
        ? cta || "構成内に行動誘導が含まれています"
        : "最後の行動誘導（プロフ誘導など）を追加してください",
    },
    {
      id: "product",
      label: "商品説明",
      ok: productOk,
      detail: productOk
        ? `商品「${product.slice(0, 40)}」が紐づいています`
        : "商品名または説明を確認してください",
    },
  ];
}

/**
 * AI改善提案（クライアント即時・再生成のヒント用）
 */
export function buildImproveSuggestion(
  kind: ImproveKind,
  payload: VideoPreviewPayload
): ImproveSuggestion {
  const product =
    payload.productName?.trim() || payload.title?.trim() || "この商品";
  const hook = payload.hook?.trim() || "";
  const cta = payload.cta?.trim() || "";

  if (kind === "hook") {
    const after = hook
      ? `正直に言うと…${hook.replace(/^正直に言うと[…\.．]*/, "")}`.slice(0, 60)
      : `これ知らないと損するかも。${product}、最初の3秒だけ見て`;
    return {
      kind,
      label: "冒頭3秒改善",
      before: hook || "（未設定）",
      after:
        /[？?]/.test(after) || after.includes("知ってた")
          ? after
          : `${after}、知ってた？`,
      tip: "問いかけ・本音・損失回避のいずれかでスクロールを止めます",
    };
  }

  if (kind === "cta") {
    return {
      kind,
      label: "CTA改善",
      before: cta || "（未設定）",
      after:
        "気になった人はプロフィールのリンクからチェックしてね（保存も忘れずに）",
      tip: "行動を1つに絞り、保存・プロフ誘導をセットにすると反応が安定します",
    };
  }

  // tiktok
  return {
    kind,
    label: "TikTok向け最適化",
    before: [
      hook ? `フック: ${hook}` : null,
      cta ? `CTA: ${cta}` : null,
      payload.captionsEnabled === false ? "字幕OFF" : null,
    ]
      .filter(Boolean)
      .join(" / ") || "現状の構成",
    after: [
      "冒頭1秒で顔 or 商品のアップ",
      "字幕ON・大きめ",
      "15〜20秒で完結",
      "最後にプロフ誘導＋保存促し",
    ].join(" → "),
    tip: "TikTokは『止める→見せる→動かす』の順が強いです。再生成時に字幕ON・短尺を推奨します",
  };
}

export function checklistAllOk(items: PreviewChecklistItem[]): boolean {
  return items.every((i) => i.ok);
}
