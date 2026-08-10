import type {
  GenerateVideoInput,
  GenerateVideoResult,
  VideoGenerationProvider,
} from "./types";

/**
 * 開発・UI確認用モック。
 * 最小の有効な mp4 ヘッダ風バイナリを返す（実再生は保証しない）。
 * 本番接続前のフロー検証用。
 */
export class MockVideoProvider implements VideoGenerationProvider {
  readonly id = "mock" as const;

  async generate(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    // わずかな遅延で非同期感を出す
    await new Promise((resolve) => setTimeout(resolve, 400));

    const note = [
      "ZENOVA mock video provider",
      `motion=${input.motion}`,
      `duration=${input.durationSec}s`,
      `product=${input.productName ?? ""}`,
    ].join(" | ");

    // ftyp + mdat の最小スケルトン（プレースホルダ）
    const encoder = new TextEncoder();
    const payload = encoder.encode(note);
    const header = Buffer.from([
      0x00, 0x00, 0x00, 0x18, // box size
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x69, 0x73, 0x6f, 0x6d, // 'isom'
      0x00, 0x00, 0x00, 0x01,
      0x69, 0x73, 0x6f, 0x6d,
      0x6d, 0x70, 0x34, 0x31, // 'mp41'
    ]);

    const mdatSize = Buffer.alloc(4);
    mdatSize.writeUInt32BE(8 + payload.length, 0);
    const mdat = Buffer.concat([
      mdatSize,
      Buffer.from("mdat"),
      Buffer.from(payload),
    ]);

    const videoBytes = Buffer.concat([header, mdat]);

    return {
      videoBytes,
      provider: this.id,
      model: "mock-i2v-v1",
      remoteUrl: null,
      meta: {
        mock: true,
        prompt: input.prompt,
        imageBytesApprox: Math.floor(input.imageBase64.length * 0.75),
      },
    };
  }
}
