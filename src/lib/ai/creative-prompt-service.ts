import Groq from "groq-sdk";
import { getWinningPatternPromptBlock } from "@/lib/video-intelligence";

const MODEL = "llama-3.3-70b-versatile";

function getGroq() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY が設定されていません");
  return new Groq({ apiKey });
}

function text(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function inferCategoryHint(...parts: string[]): string | null {
  const source = parts.join("\n");
  const match = source.match(/カテゴリ[:：]\s*([^\n]+)|product_category[:：]\s*([^\n]+)|【カテゴリ】\s*([^\n]+)/i);
  return (match?.[1] || match?.[2] || match?.[3])?.trim() || null;
}

/**
 * Shared prompt service. ZENOVA prepares creative instructions; video/image
 * rendering is delegated to the selected external provider.
 */
export async function generateCreativePrompt(task: string, payload: Record<string, unknown>) {
  const groq = getGroq();

  if (task === "video") {
    const product = text(payload.product_name, 300);
    const target = text(payload.target, 500);
    const platform = text(payload.platform, 100);
    if (!product) throw new Error("product_name が必要です");

    const intelligence = await getWinningPatternPromptBlock({
      category: inferCategoryHint(product, target),
      limit: 40,
    });

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "あなたはSNS動画制作の専門家です。日本語で回答してください。勝ちパターンを優先し、実際の映像生成AIへ渡せる具体的な指示を作ってください。動画そのものは生成しません。",
        },
        {
          role: "user",
          content: `商品:\n${product}\n\nターゲット:\n${target}\n\n媒体:\n${platform}\n\n${intelligence}\n\n15秒動画の企画を作成してください。冒頭3秒のフック、ショットごとの映像、カメラ動作、ナレーション、外部動画生成AI向けの最終プロンプトを含めてください。`,
        },
      ],
    });
    return { video: response.choices[0]?.message?.content ?? "" };
  }

  if (task === "image") {
    const title = text(payload.title, 300);
    const scene = text(payload.scene, 3000);
    if (!title || !scene) throw new Error("title と scene が必要です");

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "あなたは外部画像生成AI向けのプロンプト設計者です。日本語で、主題・構図・光・質感・カメラ・ネガティブ要素を具体的に書いてください。画像そのものは生成しません。",
        },
        {
          role: "user",
          content: `動画タイトル:\n${title}\n\n映像シーン:\n${scene}\n\nこのシーンの最初の1枚を外部画像生成AIで作るためのプロンプトを作成してください。画像プロンプト、ネガティブプロンプト、カメラ設定を含めてください。`,
        },
      ],
    });
    return { image_prompt: response.choices[0]?.message?.content ?? "" };
  }

  throw new Error("未対応のタスクです");
}
