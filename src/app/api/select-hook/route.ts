import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    status: "disabled",
    message: "Select hook API temporarily disabled"
  });
}
