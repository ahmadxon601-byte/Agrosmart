import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { findUserById, SESSION_COOKIE, toSessionUser, verifySessionToken } from "@/lib/auth";

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

  const storedUser = await findUserById(session.id);
  return NextResponse.json({ user: storedUser ? toSessionUser(storedUser) : null });
}
