export type VideoProviderId = "mock" | "kling" | "luma";

export type GenerateVideoInput = {
  /** raw base64 or data-url base64 */
  imageBase64: string;
  /** motion instruction */
  motion: string;
  /** assembled prompt for providers that need it */
  prompt: string;
  productName?: string;
  durationSec: number;
};

export type GenerateVideoResult = {
  /** mp4 bytes */
  videoBytes: Buffer;
  provider: VideoProviderId;
  model: string;
  /** optional remote url if provider returns one */
  remoteUrl?: string | null;
  meta?: Record<string, unknown>;
};

export interface VideoGenerationProvider {
  readonly id: VideoProviderId;
  generate(input: GenerateVideoInput): Promise<GenerateVideoResult>;
}
