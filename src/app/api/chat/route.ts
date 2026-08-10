import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    status: "disabled",
    message: "Chat API temporarily disabled"
  });
}
