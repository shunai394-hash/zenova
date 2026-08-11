import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy: Supabase Auth セッションをリクエストごとに更新する。
 * 認証必須のリダイレクトは各 API / 画面側で行い、公開フローは維持する。
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 静的アセット以外でセッションを更新。
     * API ルートも含め、Cookie を確実に引き継ぐ。
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
