-- SECURITY PATCH: enforce that the authenticated caller can only mutate their own usage.
-- Re-defines the existing function body without changing its public signature.

-- ZENOVA: 原子的な動画利用量計上
-- 同一 user_id + request_id の二重計上と同時実行による上限超過をDB側で防止する。
--
-- 重要:
-- - 既存データを自動削除・改変しない。
-- - 既存の重複 request_id が存在する場合、unique index 作成時に migration を停止して検知する。
-- - SECURITY DEFINER は search_path を public に固定する。

create unique index if not exists usage_logs_video_request_unique_idx
  on public.usage_logs (
    user_id,
    usage_type,
    ((metadata ->> 'request_id'))
  )
  where usage_type = 'video'
    and metadata ? 'request_id'
    and nullif(metadata ->> 'request_id', '') is not null;

create index if not exists usage_logs_user_type_created_amount_idx
  on public.usage_logs (user_id, usage_type, created_at desc, amount);

create or replace function public.consume_video_usage_atomic(
  p_user_id uuid,
  p_request_id text,
  p_plan_limit integer,
  p_period_start timestamptz,
  p_daily_start timestamptz,
  p_test_allowance_limit integer default 0,
  p_use_test_allowance boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  ok boolean,
  already_counted boolean,
  consumed_from text,
  used integer,
  remaining integer,
  extra_credit integer,
  error text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer := 0;
  v_extra_credit integer := 0;
  v_plan_remaining integer := 0;
  v_daily_used integer := 0;
  v_remaining integer := 0;
  v_consumed_from text;
  v_metadata jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return query select false, false, null::text, 0, 0, 0, '認証ユーザーと対象ユーザーが一致しません';
    return;
  end if;

  if p_user_id is null then
    return query select false, false, null::text, 0, 0, 0, 'user_id が指定されていません';
    return;
  end if;

  if nullif(trim(p_request_id), '') is null then
    return query select false, false, null::text, 0, 0, 0, 'request_id が指定されていません';
    return;
  end if;

  if p_plan_limit < 0 then
    return query select false, false, null::text, 0, 0, 0, 'video limit が不正です';
    return;
  end if;

  -- 同一ユーザーの利用量判定をトランザクション内で直列化する。
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- まず冪等性を確認。二重ポーリングでは何も追加しない。
  if exists (
    select 1
    from public.usage_logs
    where user_id = p_user_id
      and usage_type = 'video'
      and metadata ->> 'request_id' = p_request_id
  ) then
    select coalesce(sum(amount), 0)::integer
      into v_used
      from public.usage_logs
      where user_id = p_user_id
        and usage_type = 'video'
        and created_at >= p_period_start;

    select coalesce(sum(credits), 0)::integer
      into v_extra_credit
      from public.video_credits
      where user_id = p_user_id;

    v_plan_remaining := greatest(0, p_plan_limit - v_used);
    v_remaining := v_plan_remaining + greatest(0, v_extra_credit);

    return query select true, true, 'already_counted'::text, v_used, v_remaining, v_extra_credit, null::text;
    return;
  end if;

  select coalesce(sum(amount), 0)::integer
    into v_used
    from public.usage_logs
    where user_id = p_user_id
      and usage_type = 'video'
      and created_at >= p_period_start;

  select coalesce(sum(credits), 0)::integer
    into v_extra_credit
    from public.video_credits
    where user_id = p_user_id;

  v_plan_remaining := greatest(0, p_plan_limit - v_used);
  v_remaining := v_plan_remaining + greatest(0, v_extra_credit);

  if v_remaining <= 0 then
    if not p_use_test_allowance then
      return query select false, false, null::text, v_used, 0, v_extra_credit, '動画生成の利用上限に達しています';
      return;
    end if;

    select coalesce(sum(amount), 0)::integer
      into v_daily_used
      from public.usage_logs
      where user_id = p_user_id
        and usage_type = 'video'
        and created_at >= p_daily_start;

    if p_test_allowance_limit <= v_daily_used then
      return query select false, false, null::text, v_daily_used, 0, v_extra_credit,
        'テスト用アカウントの1日あたり動画生成上限に達しました。翌日再度お試しください。';
      return;
    end if;

    v_consumed_from := 'test_allowance';
  elsif v_plan_remaining > 0 then
    v_consumed_from := 'plan';
  else
    v_consumed_from := 'credit';
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb)
    || jsonb_build_object(
      'request_id', p_request_id,
      'consumed_from', v_consumed_from,
      'counted_at', 'generated_videos_save'
    );

  insert into public.usage_logs (
    user_id, usage_type, amount, metadata
  ) values (
    p_user_id, 'video', 1, v_metadata
  );

  if v_consumed_from = 'credit' then
    insert into public.video_credits (
      user_id, credits, source
    ) values (
      p_user_id, -1, 'consume'
    );
    v_extra_credit := v_extra_credit - 1;
  end if;

  if v_consumed_from = 'test_allowance' then
    v_daily_used := v_daily_used + 1;
    return query select true, false, v_consumed_from,
      v_daily_used,
      greatest(0, p_test_allowance_limit - v_daily_used),
      v_extra_credit,
      null::text;
    return;
  end if;

  v_used := v_used + 1;
  v_plan_remaining := greatest(0, p_plan_limit - v_used);
  v_remaining := v_plan_remaining + greatest(0, v_extra_credit);

  return query select true, false, v_consumed_from,
    v_used, v_remaining, v_extra_credit, null::text;
exception
  when unique_violation then
    -- 競合がDB unique indexまで到達した場合も、利用済みとして扱う。
    select coalesce(sum(amount), 0)::integer
      into v_used
      from public.usage_logs
      where user_id = p_user_id
        and usage_type = 'video'
        and created_at >= p_period_start;

    select coalesce(sum(credits), 0)::integer
      into v_extra_credit
      from public.video_credits
      where user_id = p_user_id;

    return query select true, true, 'already_counted'::text,
      v_used,
      greatest(0, greatest(0, p_plan_limit - v_used) + greatest(0, v_extra_credit)),
      v_extra_credit,
      null::text;
end;
$$;

revoke all on function public.consume_video_usage_atomic(uuid, text, integer, timestamptz, timestamptz, integer, boolean, jsonb)
  from public;

grant execute on function public.consume_video_usage_atomic(uuid, text, integer, timestamptz, timestamptz, integer, boolean, jsonb)
  to authenticated, service_role;

comment on function public.consume_video_usage_atomic(uuid, text, integer, timestamptz, timestamptz, integer, boolean, jsonb)
  is 'Atomically records one completed video usage per user/request_id and prevents concurrent quota over-consumption.';

