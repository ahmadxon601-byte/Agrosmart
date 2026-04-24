import { NextResponse } from "next/server";

import { createSessionToken, isValidEmail, normalizeEmail, SESSION_COOKIE, verifyCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  if (!body?.email?.trim() || !body.password?.trim()) {
    return NextResponse.json({ error: "Email va parol majburiy." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email formati noto'g'ri." }, { status: 400 });
  }

  const user = await verifyCredentials(email, body.password);

  if (!user) {
    return NextResponse.json({ error: "Email yoki parol noto'g'ri." }, { status: 401 });
  }

  const token = await createSessionToken(user);
  const response = NextResponse.json({ user });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
