-- ZENOVA: 商品発見（アフィリエイト商品カタログ）用カラム
-- 既存 products を拡張（分析用データと共存）

alter table public.products
  add column if not exists price integer,
  add column if not exists affiliate_rate numeric(5, 2),
  add column if not exists estimated_profit integer,
  add column if not exists sell_reason text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists season text;

create index if not exists products_is_featured_idx
  on public.products (is_featured)
  where is_featured = true;

create index if not exists products_affiliate_rate_idx
  on public.products (affiliate_rate desc nulls last);

create index if not exists products_season_idx
  on public.products (season);

comment on column public.products.price is '販売価格（円）';
comment on column public.products.affiliate_rate is '報酬率（%）';
comment on column public.products.estimated_profit is '1件あたり推定利益（円）';
comment on column public.products.sell_reason is '人気・売れる理由';
comment on column public.products.is_featured is '今週の注目商品フラグ';
comment on column public.products.season is '季節タグ: spring|summer|autumn|winter|all';

-- 発見画面用サンプル（既存分析行と衝突しない名前）
insert into public.products (
  product_name,
  name,
  description,
  target,
  platform,
  image_url,
  price,
  affiliate_rate,
  estimated_profit,
  sales_score,
  sales_grade,
  sell_reason,
  is_featured,
  season,
  category,
  source,
  analysis
)
select * from (values
  (
    '冷却ネックファン Pro',
    '冷却ネックファン Pro',
    '首掛け型の冷却ファン。屋外・通勤・イベント向け。',
    '夏の暑さに悩む通勤・アウトドア層',
    'TikTok',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
    3980,
    18.0,
    716,
    86,
    'A',
    '猛暑コンテンツと相性が良く、装着シーンが1秒で伝わる',
    true,
    'summer',
    'ガジェット',
    'discovery_seed',
    '{"version":"1.0","summary":"冷却ネックファン","placeholder":true}'::jsonb
  ),
  (
    'ポータブルブレンダー',
    'ポータブルブレンダー',
    '充電式ミキサー。プロテイン・スムージー向け。',
    '健康意識の高い20〜30代',
    'TikTok',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
    4580,
    22.5,
    1030,
    82,
    'A',
    '朝ルーティン系リールで伸びやすい定番カテゴリ',
    true,
    'summer',
    'キッチン',
    'discovery_seed',
    '{"version":"1.0","summary":"ポータブルブレンダー","placeholder":true}'::jsonb
  ),
  (
    'ワイヤレスイヤホン AirFit',
    'ワイヤレスイヤホン AirFit',
    'ノイキャン搭載の軽量イヤホン。',
    '通勤中に音楽を聴く20〜30代',
    'TikTok',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    6980,
    15.0,
    1047,
    80,
    'A',
    '装着シーン→悩み解決の構成が作りやすい',
    true,
    'all',
    'ガジェット',
    'discovery_seed',
    '{"version":"1.0","summary":"ワイヤレスイヤホン","placeholder":true}'::jsonb
  ),
  (
    'UVカット日傘 軽量モデル',
    'UVカット日傘 軽量モデル',
    '100%遮光・超軽量の折りたたみ日傘。',
    '紫外線対策をしたい女性',
    'TikTok',
    'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600&q=80',
    3280,
    25.0,
    820,
    78,
    'B',
    '夏のUV訴求とビフォーアフターが強い',
    false,
    'summer',
    'ファッション',
    'discovery_seed',
    '{"version":"1.0","summary":"UVカット日傘","placeholder":true}'::jsonb
  ),
  (
    '加湿器 卓上USB',
    '加湿器 卓上USB',
    'デスク向け小型加湿器。秋冬の乾燥対策。',
    'デスクワークの乾燥に悩む人',
    'TikTok',
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',
    2480,
    20.0,
    496,
    74,
    'B',
    '秋冬の乾燥ネタと相性が良い',
    false,
    'autumn',
    '生活家電',
    'discovery_seed',
    '{"version":"1.0","summary":"卓上加湿器","placeholder":true}'::jsonb
  ),
  (
    '保温マグカップ スマート蓋',
    '保温マグカップ スマート蓋',
    'こぼれにくい蓋付き保温マグ。',
    'オフィスで飲み物を持ち歩く人',
    'TikTok',
    'https://images.unsplash.com/photo-1514228742587-6b1558fcc7ca?w=600&q=80',
    3980,
    19.0,
    756,
    76,
    'B',
    '秋の通勤・オフィスシーンで使いやすい',
    false,
    'autumn',
    'キッチン',
    'discovery_seed',
    '{"version":"1.0","summary":"保温マグ","placeholder":true}'::jsonb
  ),
  (
    '高単価スキンケアセット',
    '高単価スキンケアセット',
    '夜用美容液＋クリームのセット。',
    'スキンケアに投資する女性',
    'TikTok',
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80',
    12800,
    28.0,
    3584,
    84,
    'A',
    '高単価×高報酬で1件利益が大きい',
    false,
    'all',
    'ビューティー',
    'discovery_seed',
    '{"version":"1.0","summary":"スキンケアセット","placeholder":true}'::jsonb
  ),
  (
    '姿勢サポートクッション',
    '姿勢サポートクッション',
    '在宅ワーク向けランバーサポート。',
    '長時間デスクの肩こり層',
    'TikTok',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
    5480,
    21.0,
    1150,
    79,
    'B',
    '悩み訴求が明確でフックが作りやすい',
    false,
    'all',
    'ヘルスケア',
    'discovery_seed',
    '{"version":"1.0","summary":"姿勢クッション","placeholder":true}'::jsonb
  )
) as v(
  product_name, name, description, target, platform, image_url,
  price, affiliate_rate, estimated_profit, sales_score, sales_grade,
  sell_reason, is_featured, season, category, source, analysis
)
where not exists (
  select 1 from public.products p
  where p.source = 'discovery_seed'
  limit 1
);
