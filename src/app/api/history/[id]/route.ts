import { NextResponse } from "next/server";
import {
  deleteGeneratedVideo,
  getGeneratedVideoById,
} from "@/lib/sales-data";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/history/[id]
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const videoId = String(id ?? "").trim();
    if (!videoId) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    const existing = await getGeneratedVideoById(videoId);
    if (!existing) {
      return NextResponse.json(
        { error: "動画が見つかりません" },
        { status: 404 }
      );
    }

    await deleteGeneratedVideo(videoId);
    return NextResponse.json({ success: true, id: videoId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
