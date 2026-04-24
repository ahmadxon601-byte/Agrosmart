import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Login endi Firebase client orqali ishlaydi." },
    { status: 410 }
  );
}
