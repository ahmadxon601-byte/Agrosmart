import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  createSessionToken,
  isValidEmail,
  normalizeEmail,
  SESSION_COOKIE,
  updateUserEmail,
  verifySessionToken
} from "@/lib/auth";

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
    email?: string;
    currentPassword?: string;
  } | null;

  if (!body?.email?.trim() || !body.currentPassword?.trim()) {
    return NextResponse.json({ error: "Yangi email va joriy parol majburiy." }, { status: 400 });
  }

  const nextEmail = normalizeEmail(body.email);

  if (!isValidEmail(nextEmail)) {
    return NextResponse.json({ error: "Email formati noto'g'ri." }, { status: 400 });
  }

  try {
    const user = await updateUserEmail({
      userId: session.id,
      nextEmail,
      currentPassword: body.currentPassword
    });
    const nextToken = await createSessionToken(user);
    const response = NextResponse.json({ user });

    response.cookies.set(SESSION_COOKIE, nextToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email yangilanmadi." },
      { status: 400 }
    );
  }
}
