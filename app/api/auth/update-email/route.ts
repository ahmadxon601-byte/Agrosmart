import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email yangilash endi Firebase client orqali ishlaydi." },
    { status: 410 }
  );
}
