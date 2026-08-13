import type {
  GenerateVideoInput,
  GenerateVideoResult,
  VideoGenerationProvider,
} from "./types";

export class WanGPVideoProvider implements VideoGenerationProvider {
  readonly id = "wangp" as const;

  async generate(_input: GenerateVideoInput): Promise<GenerateVideoResult> {
    throw new Error(
      "WanGP provider is not connected yet. Python bridge implementation is required."
    );
  }
}
