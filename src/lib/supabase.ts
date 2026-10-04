import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * データアクセス用（publishable）クライアント。
 * 認証セッションには使わないこと。
 * ログイン / OAuth は `@/lib/supabase/client` の createSupabaseBrowserClient を使う。
 *
 * Next.js はビルド中に Route Handler のモジュールを評価する場合がある。
 * その時点で env を必須にすると、リクエストを受けていないビルド段階で落ちる。
 * 実際に DB クライアントを使う最初のアクセスまで初期化を遅延させる。
 */
type SupabaseDataClient = ReturnType<typeof createClient>;

let client: SupabaseDataClient | undefined;

function getClient(): SupabaseDataClient {
  if (!client) {
    client = createClient(getSupabaseUrl(), getSupabasePublishableKey());
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseDataClient, {
  get(_target, property) {
    const instance = getClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
