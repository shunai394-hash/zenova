import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getWinningPatternPromptBlock } from "@/lib/video-intelligence";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function inferCategoryHint(...parts: Array<string | undefined>): string | null {
  const text = parts.filter(Boolean).join("\n");
  const match = text.match(
    /カテゴリ[:：]\s*([^\n]+)|product_category[:：]\s*([^\n]+)|【カテゴリ】\s*([^\n]+)/i
  );
  const value = match?.[1] || match?.[2] || match?.[3];
  return value?.trim() || null;
}

export async function POST(req: NextRequest) {
  try {
    const {
      product_name,
      target,
      platform,
    } = await req.json();

    const categoryHint = inferCategoryHint(
      String(product_name ?? ""),
      String(target ?? "")
    );

    const intelligenceBlock = await getWinningPatternPromptBlock({
      category: categoryHint,
      limit: 40,
    });

    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "あなたはSNS動画制作の専門家です。日本語で回答してください。蓄積された勝ちパターン（人気テンプレート・成績の良いフック・CTR/CVR）を優先して企画してください。",
        },
        {
          role: "user",
          content: `
商品:
${product_name}

ターゲット:
${target}

媒体:
${platform}

${intelligenceBlock}

15秒動画の企画を作ってください。
勝ちパターンの人気テンプレートと成績の良いフックを反映してください。

出力:
タイトル
冒頭3秒フック
映像内容
ナレーション
`,
        },
      ],
    });

    return NextResponse.json({
      video:
        result.choices[0].message.content,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}
