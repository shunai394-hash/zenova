import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * データアクセス用（anon）クライアント。
 * 認証セッションには使わないこと。
 * ログイン / OAuth は `@/lib/supabase/client` の createSupabaseBrowserClient を使う。
 *
 * クライアントの初期化を最初のアクセスまで遅延させる。
 * Next.js が Route Handler のページデータを収集する段階では
 * 環境変数が未設定でもモジュールを import できるようにする。
 * 実際の DB アクセス時には env.ts が不足設定を明示的にエラーにする。
 */
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(getSupabaseUrl(), getSupabasePublishableKey());
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const instance = getClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
