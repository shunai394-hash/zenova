import { supabase } from "@/lib/supabase";
import { getCurrentSeason, seasonLabel } from "./season";
import type {
  DiscoveryPayload,
  DiscoveryProduct,
  DiscoverySeason,
} from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function toDiscoveryProduct(row: Record<string, unknown>): DiscoveryProduct {
  return {
    id: asString(row.id),

    name:
      asString(row.name).trim() ||
      asString(row.product_name).trim() ||
      "商品名なし",

    image_url: asString(row.image_url).trim() || null,

    price: asNumber(row.price),
    affiliate_rate: asNumber(row.affiliate_rate),
    estimated_profit: asNumber(row.estimated_profit),

    sales_score: asNumber(row.sales_score),

    sell_reason:
      asString(row.sell_reason).trim() || null,

    trend_direction:
      asString(row.trend_direction).trim() || null,

    competition_level:
      asString(row.competition_level).trim() || null,

    best_platform:
      asString(row.best_platform).trim() || null,

    is_featured: Boolean(row.is_featured),

    season:
      asString(row.season).trim() || null,

    category:
      asString(row.category).trim() || null,
  };
}


const SELECT_COLS =
  "id, name, product_name, image_url, price, affiliate_rate, estimated_profit, sales_score, sell_reason, trend_direction, competition_level, best_platform, is_featured, season, category";


async function fetchProducts(
  queryBuilder: any
): Promise<DiscoveryProduct[]> {

  const { data, error } = await queryBuilder;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item: Record<string, unknown>) =>
    toDiscoveryProduct(item)
  );
}


export async function getProductDiscovery(
  input?: {
    featuredLimit?: number;
    rewardLimit?: number;
    seasonalLimit?: number;
  }
): Promise<DiscoveryPayload> {
  const featuredLimit = input?.featuredLimit ?? 4;
  const rewardLimit = input?.rewardLimit ?? 4;
  const seasonalLimit = input?.seasonalLimit ?? 4;
  // 除外後に足りるよう多めに取得
  const fetchMultiplier = 5;

  const season = getCurrentSeason();
  const warnings: string[] = [];

  let featured: DiscoveryProduct[] = [];
  let highRewardRaw: DiscoveryProduct[] = [];
  let seasonalRaw: DiscoveryProduct[] = [];

  try {
    featured = await fetchProducts(
      supabase
        .from("products")
        .select(SELECT_COLS)
        .eq("is_featured", true)
        .order("sales_score", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(featuredLimit)
    );
  } catch (error) {
    warnings.push(
      `featured: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const featuredIds = new Set(featured.map((p) => p.id));

  try {
    highRewardRaw = await fetchProducts(
      supabase
        .from("products")
        .select(SELECT_COLS)
        .not("affiliate_rate", "is", null)
        .order("affiliate_rate", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(rewardLimit * fetchMultiplier)
    );
  } catch (error) {
    warnings.push(
      `high_reward: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const highReward = highRewardRaw
    .filter((p) => !featuredIds.has(p.id))
    .slice(0, rewardLimit);

  const usedIds = new Set([
    ...featuredIds,
    ...highReward.map((p) => p.id),
  ]);

  try {
    seasonalRaw = await fetchProducts(
      supabase
        .from("products")
        .select(SELECT_COLS)
        .in("season", [season, "all"])
        .order("sales_score", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(seasonalLimit * fetchMultiplier)
    );
  } catch (error) {
    warnings.push(
      `seasonal: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const seasonal = seasonalRaw
    .filter((p) => !usedIds.has(p.id))
    .slice(0, seasonalLimit);

  return {
    featured,
    high_reward: highReward,
    seasonal,
    season,
    season_label: seasonLabel(season),
    supabase_ok: warnings.length === 0,
    warnings,
  };
}



export async function getDiscoveryProductById(
  id: string
): Promise<DiscoveryProduct | null> {

  const { data, error } = await supabase
    .from("products")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();


  if (error) {
    throw new Error(error.message);
  }


  if (!data) {
    return null;
  }


  return toDiscoveryProduct(
    data as Record<string, unknown>
  );
}