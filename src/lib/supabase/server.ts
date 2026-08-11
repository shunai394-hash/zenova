import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Server Components / Route Handlers / Server Actions 用。
 * リクエストごとの Cookie からセッションを読む。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          // Server Component では Cache-Control を書けない場合がある
          void headers;
        } catch {
          // Proxy がセッション更新を担当するため、ここでは無視してよい
        }
      },
    },
  });
}
