import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * データアクセス用（anon）クライアント。
 * 認証セッションには使わないこと。
 * ログイン / OAuth は `@/lib/supabase/client` の createSupabaseBrowserClient を使う。
 */
export const supabase = createClient(
  getSupabaseUrl(),
  getSupabasePublishableKey()
);
