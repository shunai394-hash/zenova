import { NextRequest, NextResponse } from "next/server";
import { generateCreativePrompt } from "@/lib/ai/creative-prompt-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    return NextResponse.json(await generateCreativePrompt("image", payload), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "画像プロンプトの生成に失敗しました";
    console.error("[generate-image] failed", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
