import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE, updateUserPassword, verifySessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Session topilmadi." }, { status: 401 });
  }

  const session = await verifySessionToken(token);

  if (!session?.id) {
    return NextResponse.json({ error: "Session yaroqsiz." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: string;
    nextPassword?: string;
  } | null;

  if (!body?.currentPassword?.trim() || !body.nextPassword?.trim()) {
    return NextResponse.json({ error: "Joriy va yangi parol majburiy." }, { status: 400 });
  }

  if (body.nextPassword.length < 6) {
    return NextResponse.json({ error: "Yangi parol kamida 6 ta belgidan iborat bo'lsin." }, { status: 400 });
  }

  try {
    const user = await updateUserPassword({
      userId: session.id,
      currentPassword: body.currentPassword,
      nextPassword: body.nextPassword
    });

    return NextResponse.json({ user, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Parol yangilanmadi." },
      { status: 400 }
    );
  }
}
