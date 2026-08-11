import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Client Component / ブラウザ用。
 * セッションは Cookie に保存され、Server / API と共有される。
 * createBrowserClient は内部でシングルトン。
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}
