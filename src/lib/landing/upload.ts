import { supabase } from "@/lib/supabase";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_BYTES = 5 * 1024 * 1024;

export type ImageUploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string; notReady?: boolean };

/**
 * product-images バケットへアップロード。
 * バケット未作成・権限不足時は notReady を返す（UI側で近日公開表示）。
 */
export async function uploadProductImage(
  file: File
): Promise<ImageUploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "jpg / png / webp のみアップロードできます" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "画像は5MB以下にしてください" };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    // NOTE: Supabase Storage に `product-images` バケットを作成し、
    // public read / authenticated or anon upload を許可してください。
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      // バケット未作成など
      if (/bucket|not found|row-level|policy|jwt|unauthorized/i.test(error.message)) {
        return {
          ok: false,
          error: error.message,
          notReady: true,
        };
      }
      return { ok: false, error: error.message };
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      return { ok: false, error: "公開URLの取得に失敗しました" };
    }

    return { ok: true, publicUrl: data.publicUrl };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      notReady: true,
    };
  }
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
