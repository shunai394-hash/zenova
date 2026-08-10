import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {

    const {
      title,
      scene,
    } = await req.json();


    const result = await groq.chat.completions.create({

      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content:
            "あなたはAI動画用の画像プロンプト作成専門家です。日本語で作成してください。",
        },

        {
          role: "user",
          content: `
動画タイトル:
${title}

映像シーン:
${scene}

この動画の最初の1枚を作るための画像生成プロンプトを作成してください。

出力:
画像プロンプト:
ネガティブプロンプト:
カメラ設定:
`,
        },
      ],

    });


    return NextResponse.json({
      image_prompt: result.choices[0].message.content,
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