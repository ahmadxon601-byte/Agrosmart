import { promises as fs } from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  provider: "credentials" | "google";
  createdAt: string;
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

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
export const SESSION_COOKIE = "agrosmart_session";
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
  const secret = process.env.AUTH_SECRET || process.env.GEMINI_API_KEY || "agrosmart-dev-secret";
  return new TextEncoder().encode(secret);
}

async function ensureUsersFile() {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });

  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
}

export async function readUsers() {
  await ensureUsersFile();
  const raw = await fs.readFile(USERS_FILE, "utf8");
  return JSON.parse(raw) as StoredUser[];
}

async function writeUsers(users: StoredUser[]) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
  const users = await readUsers();
  return users.find((user) => user.id === id) ?? null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export async function createCredentialsUser(input: { name: string; email: string; password: string }) {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    throw new Error("Bu email bilan account allaqachon mavjud.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const users = await readUsers();
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash,
    provider: "credentials",
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await writeUsers(users);

  return toSessionUser(user);
}

export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? toSessionUser(user) : null;
}

export async function upsertGoogleUser(input: { name: string; email: string }) {
  const users = await readUsers();
  const existing = users.find((user) => user.email.toLowerCase() === input.email.toLowerCase());

  if (existing) {
    return toSessionUser(existing);
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    provider: "google",
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await writeUsers(users);

  return toSessionUser(user);
}

export async function updateUserEmail(input: { userId: string; nextEmail: string; currentPassword: string }) {
  const users = await readUsers();
  const targetIndex = users.findIndex((user) => user.id === input.userId);

  if (targetIndex === -1) {
    throw new Error("Foydalanuvchi topilmadi.");
  }

  const target = users[targetIndex];

  if (target.provider !== "credentials" || !target.passwordHash) {
    throw new Error("Bu account uchun emailni shu yerda o'zgartirib bo'lmaydi.");
  }

  const passwordOk = await bcrypt.compare(input.currentPassword, target.passwordHash);

  if (!passwordOk) {
    throw new Error("Joriy parol noto'g'ri.");
  }

  const normalizedEmail = normalizeEmail(input.nextEmail);
  const duplicate = users.find(
    (user) => user.id !== target.id && user.email.toLowerCase() === normalizedEmail.toLowerCase()
  );

  if (duplicate) {
    throw new Error("Bu email bilan boshqa account mavjud.");
  }

  const updatedUser: StoredUser = {
    ...target,
    email: normalizedEmail
  };

  users[targetIndex] = updatedUser;
  await writeUsers(users);

  return toSessionUser(updatedUser);
}

export async function updateUserPassword(input: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
}) {
  const users = await readUsers();
  const targetIndex = users.findIndex((user) => user.id === input.userId);

  if (targetIndex === -1) {
    throw new Error("Foydalanuvchi topilmadi.");
  }

  const target = users[targetIndex];

  if (target.provider !== "credentials" || !target.passwordHash) {
    throw new Error("Bu account uchun parolni shu yerda o'zgartirib bo'lmaydi.");
  }

  const passwordOk = await bcrypt.compare(input.currentPassword, target.passwordHash);

  if (!passwordOk) {
    throw new Error("Joriy parol noto'g'ri.");
  }

  const nextPasswordHash = await bcrypt.hash(input.nextPassword, 10);
  const updatedUser: StoredUser = {
    ...target,
    passwordHash: nextPasswordHash
  };

  users[targetIndex] = updatedUser;
  await writeUsers(users);

  return toSessionUser(updatedUser);
}

export async function updateUserProfile(input: {
  userId: string;
  name: string;
  farmProfile: Partial<FarmProfile>;
}) {
  const users = await readUsers();
  const targetIndex = users.findIndex((user) => user.id === input.userId);

  if (targetIndex === -1) {
    throw new Error("Foydalanuvchi topilmadi.");
  }

  const target = users[targetIndex];
  const updatedUser: StoredUser = {
    ...target,
    name: input.name.trim(),
    farmProfile: {
      ...defaultFarmProfile,
      ...target.farmProfile,
      ...input.farmProfile
    }
  };

  users[targetIndex] = updatedUser;
  await writeUsers(users);

  return toSessionUser(updatedUser);
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

export function toSessionUser(user: StoredUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    createdAt: user.createdAt,
    farmProfile: {
      ...defaultFarmProfile,
      ...user.farmProfile
    }
  };
}
