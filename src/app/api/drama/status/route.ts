import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.MPT_API_URL?.trim().replace(/\/$/, "");
  if (!base) return NextResponse.json({ ready: false, message: "MoneyPrinterTurbo API URL が未設定です。" });

  try {
    const apiKey = process.env.MPT_API_KEY?.trim();
    const response = await fetch(`${base}/ping`, {
      headers: { Accept: "text/plain", ...(apiKey ? { "x-api-key": apiKey } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return NextResponse.json({ ready: false, message: `MoneyPrinterTurboに接続できません（HTTP ${response.status}）。` });
  } catch {
    return NextResponse.json({ ready: false, message: "MoneyPrinterTurbo APIに接続できません。API URLとネットワーク設定を確認してください。" });
  }

  const source = process.env.MPT_VIDEO_SOURCE?.trim();
  if (!source) return NextResponse.json({ ready: false, message: "MoneyPrinterTurbo本体には接続済みです。動画素材ソースが未設定です。" });

  const localOnly = source.toLowerCase() === "local";
  if (!localOnly || process.env.MPT_VIDEO_SOURCE_IS_FREE !== "true") {
    return NextResponse.json({ ready: false, message: `MoneyPrinterTurbo本体には接続済みですが、選択中の素材ソース「${source}」は無料と確認できないため停止しています。` });
  }

  return NextResponse.json({ ready: true, message: "MoneyPrinterTurbo接続済み。ローカル素材のみを使用する無料設定です。生成には素材動画のアップロードが必要です。" });
}
