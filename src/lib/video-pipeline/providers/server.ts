/**
 * サーバー専用 VideoProvider 解決
 * API Route / server actions からのみ import
 */

import "server-only";

import { resolveVideoProviderId } from "./index";
import { KlingServerVideoProvider } from "./kling-provider.server";
import { MockVideoProvider } from "./mock-provider";
import { StubVideoProvider } from "./stub-provider";
import type { VideoProvider } from "./types";

/**
 * VIDEO_PROVIDER に応じたサーバー実装。
 * Kling は実 API アダプタを返す。
 */
export function getServerVideoProvider(
  providerId?: string | null
): VideoProvider {
  const id = resolveVideoProviderId(providerId);

  switch (id) {
    case "mock":
      return new MockVideoProvider();
    case "kling":
      return new KlingServerVideoProvider();
    case "seedance":
    case "runway":
    case "sora":
    case "luma":
      return new StubVideoProvider(id);
    default:
      return new MockVideoProvider();
  }
}
