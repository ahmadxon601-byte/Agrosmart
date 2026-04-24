import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

import { createSessionToken, isValidEmail, normalizeEmail, SESSION_COOKIE, upsertGoogleUser } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    credential?: string;
  } | null;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID sozlanmagan." }, { status: 400 });
  }

  if (!body?.credential) {
    return NextResponse.json({ error: "Google credential topilmadi." }, { status: 400 });
  }

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: body.credential,
      audience: clientId
    });
    const payload = ticket.getPayload();
    const name = payload?.name?.trim() ?? "";
    const email = payload?.email ? normalizeEmail(payload.email) : "";

    if (!email || !name) {
      throw new Error("Google account ma'lumoti to'liq emas.");
    }

    if (!payload?.email_verified) {
      throw new Error("Google email tasdiqlanmagan.");
    }

    if (!isValidEmail(email)) {
      throw new Error("Google email formati noto'g'ri.");
    }

    const user = await upsertGoogleUser({
      name,
      email
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
      { error: error instanceof Error ? error.message : "Google login bajarilmadi." },
      { status: 400 }
    );
  }
}
