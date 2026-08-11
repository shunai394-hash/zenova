import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
};

/**
 * Cookie セッションからログインユーザーを取得（未ログインは null）。
 * Proxy で更新された Cookie を createServerClient 経由で読む。
 */
export async function getOptionalAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Auth セッション切れ / 未ログインのみ null（一時エラーと区別しやすいよう error は握りつぶす）
    if (error || !user) {
      return null;
    }

    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}

/** ログイン必須。未ログイン時は null（既存 API 互換） */
export async function requireAuthUser(): Promise<AuthUser | null> {
  return getOptionalAuthUser();
}
