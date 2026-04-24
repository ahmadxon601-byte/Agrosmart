import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { firebaseProjectId } from "@/lib/firebase-config";

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

type FirebaseJwtPayload = JWTPayload & {
  email?: string;
  name?: string;
  firebase?: {
    sign_in_provider?: string;
  };
};

export async function verifyFirebaseIdToken(idToken: string) {
  const verified = await jwtVerify(idToken, firebaseJwks, {
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId
  });

  return verified.payload as FirebaseJwtPayload;
}
