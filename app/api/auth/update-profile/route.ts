import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  createSessionToken,
  defaultFarmProfile,
  SESSION_COOKIE,
  updateUserProfile,
  type FarmProfile,
  verifySessionToken
} from "@/lib/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Session topilmadi." }, { status: 401 });
  }

  const session = await verifySessionToken(token);

  if (!session?.id) {
    return NextResponse.json({ error: "Session yaroqsiz." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    farmProfile?: Partial<FarmProfile>;
  } | null;

  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "Ism majburiy." }, { status: 400 });
  }

  const farmProfile = sanitizeFarmProfile(body.farmProfile ?? {});

  try {
    const user = await updateUserProfile({
      userId: session.id,
      name: body.name,
      farmProfile
    });
    const nextToken = await createSessionToken(user);
    const response = NextResponse.json({ user });

    response.cookies.set(SESSION_COOKIE, nextToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Profil yangilanmadi." },
      { status: 400 }
    );
  }
}

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim().slice(0, 120) : fallback;
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeFarmProfile(input: Partial<FarmProfile>): FarmProfile {
  return {
    phone: cleanText(input.phone, defaultFarmProfile.phone),
    farmName: cleanText(input.farmName, defaultFarmProfile.farmName),
    region: cleanText(input.region, defaultFarmProfile.region),
    district: cleanText(input.district, defaultFarmProfile.district),
    village: cleanText(input.village, defaultFarmProfile.village),
    landSize: cleanText(input.landSize, defaultFarmProfile.landSize),
    activity: cleanText(input.activity, defaultFarmProfile.activity),
    experience: cleanText(input.experience, defaultFarmProfile.experience),
    soilType: cleanText(input.soilType, defaultFarmProfile.soilType),
    mainCrops: cleanText(input.mainCrops, defaultFarmProfile.mainCrops),
    irrigationType: cleanText(input.irrigationType, defaultFarmProfile.irrigationType),
    waterSource: cleanText(input.waterSource, defaultFarmProfile.waterSource),
    salinity: cleanText(input.salinity, defaultFarmProfile.salinity),
    defaultRegion: cleanText(input.defaultRegion, defaultFarmProfile.defaultRegion),
    defaultSoil: cleanText(input.defaultSoil, defaultFarmProfile.defaultSoil),
    season: cleanText(input.season, defaultFarmProfile.season),
    language: cleanText(input.language, defaultFarmProfile.language),
    weatherAlerts: cleanBoolean(input.weatherAlerts, defaultFarmProfile.weatherAlerts),
    irrigationReminders: cleanBoolean(input.irrigationReminders, defaultFarmProfile.irrigationReminders)
  };
}
