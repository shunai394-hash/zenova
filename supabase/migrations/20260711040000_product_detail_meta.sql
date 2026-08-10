-- 商品詳細（販売判断）用メタデータ

alter table public.products
  add column if not exists trend_direction text,
  add column if not exists competition_level text,
  add column if not exists best_platform text;

comment on column public.products.trend_direction is 'トレンド方向: rising|stable|falling など';
comment on column public.products.competition_level is '競合レベル: low|medium|high など';
comment on column public.products.best_platform is '最適プラットフォーム';

-- 既存 discovery_seed に値を埋める（未設定のみ）
update public.products
set
  trend_direction = coalesce(nullif(trend_direction, ''), 'rising'),
  competition_level = coalesce(nullif(competition_level, ''), 'medium'),
  best_platform = coalesce(nullif(best_platform, ''), 'TikTok')
where source = 'discovery_seed';
