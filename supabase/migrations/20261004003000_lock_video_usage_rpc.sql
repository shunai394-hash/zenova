-- SECURITY: the usage RPC is only callable from an authenticated Supabase session.
-- The route handler verifies the same user via requireAuthUser before invoking it.

revoke execute on function public.consume_video_usage_atomic(uuid, text, integer, timestamptz, timestamptz, integer, boolean, jsonb)
  from anon;

grant execute on function public.consume_video_usage_atomic(uuid, text, integer, timestamptz, timestamptz, integer, boolean, jsonb)
  to authenticated;
