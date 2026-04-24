import { SignJWT, jwtVerify } from "jose";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  provider: "credentials" | "google";
  createdAt?: string;
  farmProfile?: FarmProfile;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  provider: StoredUser["provider"];
  createdAt?: string;
  farmProfile?: FarmProfile;
};

export type FarmProfile = {
  phone: string;
  farmName: string;
  region: string;
  district: string;
  village: string;
  landSize: string;
  activity: string;
  experience: string;
  soilType: string;
  mainCrops: string;
  irrigationType: string;
  waterSource: string;
  salinity: string;
  defaultRegion: string;
  defaultSoil: string;
  season: string;
  language: string;
  weatherAlerts: boolean;
  irrigationReminders: boolean;
};

type SessionPayload = SessionUser & {
  exp?: number;
  iat?: number;
};

export const SESSION_COOKIE = "agrosmart_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const defaultFarmProfile: FarmProfile = {
  phone: "",
  farmName: "",
  region: "toshkent",
  district: "",
  village: "",
  landSize: "",
  activity: "Dehqonchilik",
  experience: "O'rta",
  soilType: "boz",
  mainCrops: "Bug'doy, Paxta, Pomidor",
  irrigationType: "Ariq orqali",
  waterSource: "Kanal",
  salinity: "Past",
  defaultRegion: "toshkent",
  defaultSoil: "boz",
  season: "bahor",
  language: "O'zbek",
  weatherAlerts: true,
  irrigationReminders: true
};

function getAuthSecret() {
  const secret = "agrosmart-mvp-auth-secret-2026";
  return new TextEncoder().encode(secret);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const verified = await jwtVerify(token, getAuthSecret());
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}
