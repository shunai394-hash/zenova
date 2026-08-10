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
      platform
    } = await req.json();

    const categoryHint = inferCategoryHint(
      String(product_name ?? ""),
      String(target ?? "")
    );

    const intelligenceBlock = await getWinningPatternPromptBlock({
      category: categoryHint,
      limit: 40,
    });

    const completion = await groq.chat.completions.create({

      model: "llama-3.1-8b-instant",

      messages: [
        {
          role: "system",
          content:
          "あなたはTikTokやYouTube Shorts向け動画企画の専門家です。蓄積された勝ちパターン（成績の良いフック・人気テンプレート・CTR/CVR）を優先してフックを作成してください。"
        },
        {
          role: "user",
          content: `
商品:
${product_name}

ターゲット:
${target}

プラットフォーム:
${platform}

${intelligenceBlock}

3秒で興味を引く動画フックを3つ作成してください。
成績の良いフック種類を優先し、平均CTR・平均CVR・成約率が高いパターンに寄せてください。

JSONのみで返してください。

{
 "hooks":[
  {
   "hook":"",
   "type":"",
   "reason":""
  }
 ]
}
`
        }
      ],

      response_format: {
        type: "json_object"
      }

    });


    const text =
      completion.choices[0].message.content;


    return NextResponse.json(
      JSON.parse(text || "{}")
    );


  } catch(error){

    console.error(error);

    return NextResponse.json(
      {
        error:String(error)
      },
      {
        status:500
      }
    );

  }

}
