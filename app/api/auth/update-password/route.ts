import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Parol yangilash endi Firebase client orqali ishlaydi." },
    { status: 410 }
  );
}
