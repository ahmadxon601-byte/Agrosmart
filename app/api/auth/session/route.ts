import { NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, type SessionUser } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    idToken?: string;
  } | null;

  if (!body?.idToken) {
    return NextResponse.json({ error: "Firebase token topilmadi." }, { status: 400 });
  }

  try {
    const payload = await verifyFirebaseIdToken(body.idToken);

    if (!payload.sub || !payload.email) {
      throw new Error("Firebase token yaroqsiz.");
    }

    const user: SessionUser = {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : payload.email,
      provider: payload.firebase?.sign_in_provider === "google.com" ? "google" : "credentials"
    };

    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Firebase session yaratilmadi." },
      { status: 401 }
    );
  }
}
