import { access } from "fs/promises";
import path from "path";

/**
 * /generated/... または絶対/相対パスを public 配下の実ファイルパスへ解決
 */
export function resolvePublicMediaPath(urlOrPath: string): string {
  const raw = urlOrPath.trim();
  if (!raw) {
    throw new Error("media path is empty");
  }

  // file:// or absolute Windows/Unix path
  if (/^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith("\\\\") || raw.startsWith("/")) {
    if (raw.startsWith("/generated/")) {
      return path.join(process.cwd(), "public", raw.replace(/^\//, ""));
    }
    if (path.isAbsolute(raw) && !raw.startsWith("/generated")) {
      return raw;
    }
  }

  const cleaned = raw
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\.\//, "")
    .replace(/^public[\\/]/, "");

  if (cleaned.startsWith("generated/") || cleaned.startsWith("generated\\")) {
    return path.join(process.cwd(), "public", cleaned);
  }

  if (cleaned.startsWith("/generated/")) {
    return path.join(process.cwd(), "public", cleaned.slice(1));
  }

  return path.join(process.cwd(), "public", cleaned.replace(/^\//, ""));
}

export async function assertReadableFile(filePath: string, label: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} が見つかりません: ${filePath}`);
  }
}
