import { supabase } from "@/lib/supabase";
import { inferProductCategory } from "@/lib/product-analysis/repository";
import type {
  GeneratedVideoRecord,
  SalesScenarioRecord,
  SaveGeneratedVideoInput,
  SaveSalesScenarioInput,
} from "./types";

/**
 * 商品名から既存 products を探す。なければ最小行を作成。
 * 既存 analyze 保存と両立するため product_name / name 両方を埋める。
 */
export async function ensureProductRow(input: {
  product_id?: string | null;
  product_name: string;
  description?: string;
  image_url?: string | null;
  image_name?: string | null;
  category?: string | null;
  target?: string;
  platform?: string;
}): Promise<string> {
  if (input.product_id?.trim()) {
    return input.product_id.trim();
  }

  const name = input.product_name.trim();
  if (!name) {
    throw new Error("product_name は必須です");
  }

  const { data: existing, error: findError } = await supabase
    .from("products")
    .select("id")
    .eq("product_name", name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!findError && existing?.id) {
    return existing.id as string;
  }

  // name カラムがある環境向けのフォールバック
  const { data: byDisplayName } = await supabase
    .from("products")
    .select("id")
    .eq("name", name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byDisplayName?.id) {
    return byDisplayName.id as string;
  }

  const category =
    input.category?.trim() ||
    inferProductCategory(name, input.description ?? "");
  const imageUrl =
    input.image_url?.trim() ||
    (input.image_name?.trim()
      ? `/generated/images/${input.image_name.trim()}`
      : null);
  const now = new Date().toISOString();

  const baseInsert = {
    product_name: name,
    description: input.description ?? "",
    image_name: input.image_name ?? null,
    target: input.target ?? "",
    platform: input.platform ?? "TikTok",
    analysis: {
      version: "1.0",
      summary: name,
      placeholder: true,
    },
    created_at: now,
    updated_at: now,
  };

  const extendedInsert = {
    ...baseInsert,
    name,
    category,
    image_url: imageUrl,
  };

  let { data, error } = await supabase
    .from("products")
    .insert([extendedInsert])
    .select("id")
    .single();

  if (error && /name|category|image_url|schema cache|column/i.test(error.message)) {
    const retry = await supabase
      .from("products")
      .insert([baseInsert])
      .select("id")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error("products insert に成功しましたが id が返りませんでした");
  }

  return data.id as string;
}

export async function saveSalesScenario(
  input: SaveSalesScenarioInput
): Promise<SalesScenarioRecord> {
  const { data, error } = await supabase
    .from("sales_scenarios")
    .insert([
      {
        product_id: input.product_id,
        hook: input.hook,
        selling_angle: input.selling_angle,
        scene_1: input.scene_1,
        scene_2: input.scene_2,
        scene_3: input.scene_3,
        cta: input.cta,
        kling_prompt: input.kling_prompt,
        target_customer: input.target_customer ?? null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SalesScenarioRecord;
}

export async function saveGeneratedVideo(
  input: SaveGeneratedVideoInput
): Promise<GeneratedVideoRecord> {
  const row = {
    product_id: input.product_id,
    video_url: input.video_url,
    user_id: input.user_id ?? null,
    product_name: input.product_name ?? null,
    source_url: input.source_url ?? null,
    thumbnail_url: input.thumbnail_url ?? null,
    script: input.script ?? input.narration_script ?? null,
    hook: input.hook ?? null,
    style: input.style ?? null,
    status: input.status ?? "completed",
    audio_url: input.audio_url ?? null,
    score: input.score ?? null,
    hook_score: input.hook_score ?? null,
    product_score: input.product_score ?? null,
    cta_score: input.cta_score ?? null,
    tiktok_score: input.tiktok_score ?? null,
    marketing_score: input.marketing_score ?? null,
    conversion_score: input.conversion_score ?? null,
    ai_feedback: input.ai_feedback ?? null,
    scenario_id: input.scenario_id ?? null,
    narration_script: input.narration_script ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("generated_videos")
    .insert([row])
    .select("*")
    .single();

  if (error) {
    // 新カラム未適用環境向けフォールバック（既存契約維持）
    if (/column|schema cache/i.test(error.message)) {
      const { data: legacy, error: legacyError } = await supabase
        .from("generated_videos")
        .insert([
          {
            product_id: input.product_id,
            video_url: input.video_url,
            audio_url: input.audio_url ?? null,
            score: input.score ?? null,
            hook_score: input.hook_score ?? null,
            product_score: input.product_score ?? null,
            cta_score: input.cta_score ?? null,
            tiktok_score: input.tiktok_score ?? null,
            scenario_id: input.scenario_id ?? null,
            narration_script: input.narration_script ?? null,
          },
        ])
        .select("*")
        .single();
      if (legacyError) throw new Error(legacyError.message);
      return legacy as GeneratedVideoRecord;
    }
    throw new Error(error.message);
  }

  return data as GeneratedVideoRecord;
}

export async function deleteGeneratedVideo(id: string): Promise<void> {
  const { error } = await supabase
    .from("generated_videos")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getGeneratedVideoById(
  id: string
): Promise<GeneratedVideoRecord | null> {
  const { data, error } = await supabase
    .from("generated_videos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as GeneratedVideoRecord | null) ?? null;
}

/** 接続・テーブル存在確認 */
export async function probeSalesDataConnection(): Promise<{
  ok: boolean;
  products: boolean;
  sales_scenarios: boolean;
  generated_videos: boolean;
  details: Record<string, string>;
}> {
  const details: Record<string, string> = {};

  const check = async (table: string): Promise<boolean> => {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      details[table] = error.message;
      return false;
    }
    details[table] = "ok";
    return true;
  };

  const products = await check("products");
  const sales_scenarios = await check("sales_scenarios");
  const generated_videos = await check("generated_videos");

  return {
    ok: products && sales_scenarios && generated_videos,
    products,
    sales_scenarios,
    generated_videos,
    details,
  };
}
