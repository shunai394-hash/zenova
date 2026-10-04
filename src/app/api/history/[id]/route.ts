import { NextResponse } from "next/server";
import {
  deleteGeneratedVideo,
  getGeneratedVideoById,
} from "@/lib/sales-data";
import { requireAuthUser } from "@/lib/auth/session";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/history/[id]
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

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

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "この動画を削除する権限がありません" }, { status: 403 });
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
