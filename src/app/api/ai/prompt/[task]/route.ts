import { NextRequest, NextResponse } from "next/server";
import { generateCreativePrompt } from "@/lib/ai/creative-prompt-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TASKS = new Set(["video", "image"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ task: string }> }
) {
  const { task } = await context.params;
  if (!ALLOWED_TASKS.has(task)) {
    return NextResponse.json({ error: "未対応のタスクです" }, { status: 404 });
  }

  try {
    const payload = await request.json() as Record<string, unknown>;
    const result = await generateCreativePrompt(task, payload);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "プロンプト生成に失敗しました";
    console.error("[ai-prompt] failed", { task, message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
