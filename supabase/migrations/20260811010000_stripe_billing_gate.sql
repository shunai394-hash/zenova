-- Stripe 課金ゲート: Customer 紐付け + Free/Starter/Pro 上限・価格を同期
-- Free: 0本 / Starter: 10本 ¥1980 / Pro: 50本 ¥4980

alter table public.user_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists user_subscriptions_stripe_customer_id_idx
  on public.user_subscriptions (stripe_customer_id);

create index if not exists user_subscriptions_stripe_subscription_id_idx
  on public.user_subscriptions (stripe_subscription_id);

insert into public.plans (id, name, price, video_limit, image_limit, analysis_limit)
values
  ('free', 'Free', 0, 0, 5, 20),
  ('starter', 'Starter', 1980, 10, 30, 100),
  ('pro', 'Pro', 4980, 50, 100, 300),
  ('creator', 'Creator', 9800, 150, 100, 300),
  ('business', 'Business', 49800, 500, 600, 1500)
on conflict (id) do update set
  video_limit = excluded.video_limit,
  name = excluded.name,
  price = excluded.price,
  image_limit = excluded.image_limit,
  analysis_limit = excluded.analysis_limit;
