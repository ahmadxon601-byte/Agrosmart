import { NextResponse } from "next/server";

import { createCredentialsUser, createSessionToken, isValidEmail, normalizeEmail, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
  } | null;

  if (!body?.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
    return NextResponse.json({ error: "Ism, email va parol majburiy." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email formati noto'g'ri." }, { status: 400 });
  }

  if (body.password.length < 6) {
    return NextResponse.json({ error: "Parol kamida 6 ta belgidan iborat bo'lsin." }, { status: 400 });
  }

  try {
    const user = await createCredentialsUser({
      name: body.name.trim(),
      email,
      password: body.password
    });
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Account yaratilmadi." },
      { status: 400 }
    );
  }
}
