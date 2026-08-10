import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const {
      product_name,
      target,
      platform
    } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",

      messages: [
        {
          role: "system",
          content: `
You are a marketing director for TikTok, YouTube Shorts and Instagram Reels.

Create 3 short video hooks that make viewers stop watching.

Rules:
- Focus on customer problems and desires
- No fake claims
- No exaggerated promises
- Make natural advertising hooks

Return JSON only:

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
        },
        {
          role: "user",
          content: `
Product: ${product_name}

Target:
${target}

Platform:
${platform}
`
        }
      ],

      response_format:{
        type:"json_object"
      }
    });


    const result = JSON.parse(
      completion.choices[0].message.content || "{}"
    );


    return NextResponse.json(result);


  } catch(error){

    console.error(error);

    return NextResponse.json(
      {
        error:"Generation failed"
      },
      {
        status:500
      }
    );
  }
}