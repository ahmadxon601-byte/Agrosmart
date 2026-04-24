import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Ro'yxatdan o'tish endi Firebase client orqali ishlaydi." },
    { status: 410 }
  );
}
