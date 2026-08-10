-- プラン別動画生成上限を定数（src/lib/billing/plans.ts）と同期
-- Free 10 / Starter 50 / Creator 150 / Pro 300 / Business 500

insert into public.plans (id, name, price, video_limit, image_limit, analysis_limit)
values
  ('free', 'Free', 0, 10, 5, 20),
  ('starter', 'Starter', 2980, 50, 30, 100),
  ('creator', 'Creator', 9800, 150, 100, 300),
  ('pro', 'Pro', 19800, 300, 300, 800),
  ('business', 'Business', 49800, 500, 600, 1500)
on conflict (id) do update set
  video_limit = excluded.video_limit,
  name = excluded.name,
  price = excluded.price,
  image_limit = excluded.image_limit,
  analysis_limit = excluded.analysis_limit;
