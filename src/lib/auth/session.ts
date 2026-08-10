import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AuthUser = {
  id: string;
  email: string | null;
};

/** Cookie セッションからログインユーザーを取得（未ログインは null） */
export async function getOptionalAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}

/** ログイン必須。未ログイン時は null */
export async function requireAuthUser(): Promise<AuthUser | null> {
  return getOptionalAuthUser();
}
