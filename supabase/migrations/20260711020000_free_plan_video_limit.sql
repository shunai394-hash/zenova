-- Free プラン: 月1本まで動画生成可能（体験用）
-- 既存 plans 行を更新（なければ insert）

insert into public.plans (id, name, price, video_limit, image_limit, analysis_limit)
values ('free', 'Free', 0, 1, 5, 20)
on conflict (id) do update set
  video_limit = 1,
  image_limit = excluded.image_limit,
  analysis_limit = excluded.analysis_limit;
