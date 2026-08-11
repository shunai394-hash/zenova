/**
 * 互換: レガシーパス。データ用は `@/lib/supabase`、
 * ブラウザ認証は `@/lib/supabase/client` を使う。
 */
export { supabase } from "@/lib/supabase";
export { createSupabaseBrowserClient } from "@/lib/supabase/client";
