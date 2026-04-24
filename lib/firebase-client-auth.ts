"use client";

import type { User } from "firebase/auth";

export async function syncFirebaseSession(user: User) {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  const data = (await response.json()) as {
    error?: string;
    user?: {
      id: string;
      name: string;
      email: string;
      provider: "credentials" | "google";
      createdAt?: string;
    };
  };

  if (!response.ok || !data.user) {
    throw new Error(data.error || "Session yaratilmadi.");
  }

  return data.user;
}
