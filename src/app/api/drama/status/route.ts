import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.MPT_API_URL?.trim().replace(/\/$/, "");
  const source = process.env.MPT_VIDEO_SOURCE?.trim();
  const markedFree = process.env.MPT_VIDEO_SOURCE_IS_FREE === "true";
  if (!base) return NextResponse.json({ ready: false, message: "MoneyPrinterTurbo API URL が未設定です。制作エンジンの接続先を設定する必要があります。" });
  if (!source) return NextResponse.json({ ready: false, message: "動画素材プロバイダーが未設定です。Pexelsには自動で切り替えません。" });
  if (!markedFree || (/metaso|minimax|kling|luma|muapi|runway|sora|hailuo|pexels|pixabay/i.test(source) || source.toLowerCase() === "local")) return NextResponse.json({ ready: false, message: "選択中の動画プロバイダーは有料、または無料と確認できません。課金防止のため生成を停止しています。" });

  try {
    const apiKey = process.env.MPT_API_KEY?.trim();
    const response = await fetch(`${base}/api/v1/tasks?page=1&page_size=1`, {
      headers: { Accept: "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status !== 200) return NextResponse.json({ ready: false, message: `MoneyPrinterTurboに接続できません（HTTP ${response.status}）。` });
    return NextResponse.json({ ready: true, message: `MoneyPrinterTurbo接続済み。無料設定済みプロバイダー: ${source}` });
  } catch {
    return NextResponse.json({ ready: false, message: "MoneyPrinterTurbo APIに接続できません。API URLとネットワーク設定を確認してください。" });
  }
}
