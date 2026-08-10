import { supabase } from "@/lib/supabase";
import type {
  GeneratedVideoHistoryItem,
  GeneratedVideoHistoryPayload,
} from "./video-history-types";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function resolveImageUrl(row: {
  image_url?: string | null;
  image_name?: string | null;
}): string | null {
  const direct = asString(row.image_url).trim();
  if (direct) return direct;
  const name = asString(row.image_name).trim();
  if (name) return `/generated/images/${name}`;
  return null;
}

function emptyPayload(warnings: string[] = []): GeneratedVideoHistoryPayload {
  return {
    videos: [],
    supabase_ok: warnings.length === 0,
    warnings,
  };
}

/**
 * generated_videos を商品名・シナリオ付きで取得。
 * 失敗時は空配列（画面を壊さない）。
 */
export async function listGeneratedVideoHistory(
  limit = 50
): Promise<GeneratedVideoHistoryPayload> {
  const warnings: string[] = [];
  let videoRows: Record<string, unknown>[] = [];

  try {
    const { data, error } = await supabase
      .from("generated_videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return emptyPayload([`generated_videos: ${error.message}`]);
    }
    videoRows = (data ?? []) as Record<string, unknown>[];
  } catch (error) {
    return emptyPayload([
      `generated_videos: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ]);
  }

  if (videoRows.length === 0) {
    return emptyPayload();
  }

  const productIds = Array.from(
    new Set(
      videoRows
        .map((row) => asString(row.product_id).trim())
        .filter(Boolean)
    )
  );
  const scenarioIds = Array.from(
    new Set(
      videoRows
        .map((row) => asString(row.scenario_id).trim())
        .filter(Boolean)
    )
  );

  const productById = new Map<
    string,
    {
      product_name: string;
      description: string;
      target: string;
      platform: string;
      image_url: string | null;
      product_url: string | null;
    }
  >();
  const scenarioById = new Map<
    string,
    { hook: string; selling_angle: string }
  >();

  if (productIds.length > 0) {
    try {
      const primary = await supabase
        .from("products")
        .select(
          "id, product_name, name, description, target, platform, image_name, image_url, product_url"
        )
        .in("id", productIds);

      let rows: Record<string, unknown>[] | null = null;
      let productError = primary.error;

      if (
        productError &&
        /image_url|name|schema cache|column/i.test(productError.message)
      ) {
        const retry = await supabase
          .from("products")
          .select(
            "id, product_name, description, target, platform, image_name"
          )
          .in("id", productIds);
        rows = (retry.data ?? null) as Record<string, unknown>[] | null;
        productError = retry.error;
      } else {
        rows = (primary.data ?? null) as Record<string, unknown>[] | null;
      }

      if (productError) {
        warnings.push(`products: ${productError.message}`);
      } else {
        for (const row of rows ?? []) {
          const id = asString(row.id);
          if (!id) continue;
          productById.set(id, {
            product_name:
              asString(row.product_name).trim() ||
              asString(row.name).trim() ||
              "不明な商品",
            description: asString(row.description),
            target: asString(row.target),
            platform: asString(row.platform) || "TikTok",
            image_url: resolveImageUrl({
              image_url: asString(row.image_url) || null,
              image_name: asString(row.image_name) || null,
            }),
            product_url: asString(row.product_url).trim() || null,
          });
        }
      }
    } catch (error) {
      warnings.push(
        `products: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (scenarioIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("sales_scenarios")
        .select("id, hook, selling_angle")
        .in("id", scenarioIds);

      if (error) {
        warnings.push(`sales_scenarios: ${error.message}`);
      } else {
        for (const row of data ?? []) {
          const r = row as Record<string, unknown>;
          const id = asString(r.id);
          if (!id) continue;
          scenarioById.set(id, {
            hook: asString(r.hook),
            selling_angle: asString(r.selling_angle),
          });
        }
      }
    } catch (error) {
      warnings.push(
        `sales_scenarios: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const latestScenarioByProductId = new Map<
    string,
    { hook: string; selling_angle: string }
  >();

  const missingScenarioProductIds = Array.from(
    new Set(
      videoRows
        .filter((row) => {
          const scenarioId = asString(row.scenario_id).trim();
          if (!scenarioId) return true;
          return !scenarioById.has(scenarioId);
        })
        .map((row) => asString(row.product_id).trim())
        .filter(Boolean)
    )
  );

  if (missingScenarioProductIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("sales_scenarios")
        .select("product_id, hook, selling_angle, created_at")
        .in("product_id", missingScenarioProductIds)
        .order("created_at", { ascending: false });

      if (error) {
        warnings.push(`sales_scenarios(fallback): ${error.message}`);
      } else {
        for (const row of data ?? []) {
          const r = row as Record<string, unknown>;
          const productId = asString(r.product_id);
          if (!productId || latestScenarioByProductId.has(productId)) continue;
          latestScenarioByProductId.set(productId, {
            hook: asString(r.hook),
            selling_angle: asString(r.selling_angle),
          });
        }
      }
    } catch (error) {
      warnings.push(
        `sales_scenarios(fallback): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const videos: GeneratedVideoHistoryItem[] = videoRows.map((row) => {
    const productId = asString(row.product_id);
    const scenarioId = asString(row.scenario_id);
    const product = productById.get(productId);
    const scenario =
      (scenarioId ? scenarioById.get(scenarioId) : undefined) ??
      latestScenarioByProductId.get(productId);

    const thumbnail =
      asString(row.thumbnail_url).trim() ||
      product?.image_url ||
      null;

    return {
      id: asString(row.id),
      user_id: asString(row.user_id).trim() || null,
      product_id: productId,
      product_name:
        asString(row.product_name).trim() ||
        product?.product_name ||
        "不明な商品",
      source_url:
        asString(row.source_url).trim() || product?.product_url || null,
      video_url: asString(row.video_url),
      thumbnail_url: thumbnail,
      script:
        asString(row.script).trim() ||
        asString(row.narration_script).trim() ||
        null,
      hook: asString(row.hook).trim() || scenario?.hook || "",
      style: asString(row.style).trim() || null,
      status: asString(row.status).trim() || "completed",
      selling_angle: scenario?.selling_angle ?? "",
      score: typeof row.score === "number" ? row.score : null,
      marketing_score:
        typeof row.marketing_score === "number" ? row.marketing_score : null,
      hook_score: typeof row.hook_score === "number" ? row.hook_score : null,
      conversion_score:
        typeof row.conversion_score === "number" ? row.conversion_score : null,
      ai_feedback: asString(row.ai_feedback).trim() || null,
      previous_score:
        typeof row.previous_score === "number" ? row.previous_score : null,
      after_score: typeof row.after_score === "number" ? row.after_score : null,
      improvement_reason: asString(row.improvement_reason).trim() || null,
      next_video_plan: asString(row.next_video_plan).trim() || null,
      post_status: asString(row.post_status).trim() || null,
      created_at: asString(row.created_at) || new Date().toISOString(),
      updated_at:
        asString(row.updated_at) ||
        asString(row.created_at) ||
        new Date().toISOString(),
      description: product?.description ?? "",
      target: product?.target ?? "",
      platform: product?.platform ?? "TikTok",
      image_url: product?.image_url ?? thumbnail,
    };
  });

  return {
    videos,
    supabase_ok: warnings.length === 0,
    warnings,
  };
}
