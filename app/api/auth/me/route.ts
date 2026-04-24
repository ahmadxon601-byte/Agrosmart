import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const session = await verifySessionToken(token);

  if (!session?.id) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      provider: session.provider,
      createdAt: session.createdAt
    }
  });
}
