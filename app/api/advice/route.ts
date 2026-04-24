import { NextResponse } from "next/server";

import { buildAdvice, type AdviceResult } from "@/lib/advice";
import { regions, soils, type RegionKey, type SoilKey } from "@/lib/agro-data";
import { getWeather } from "@/lib/weather";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    region?: RegionKey;
    soil?: SoilKey;
  } | null;

  if (!body?.region || !body?.soil || !(body.region in regions) || !(body.soil in soils)) {
    return NextResponse.json({ error: "Hudud yoki tuproq turi noto'g'ri." }, { status: 400 });
  }

  const weather = await getWeather(body.region);
  const fallbackAdvice = buildAdvice(body.region, body.soil, weather);
  const advice = await buildAiAdvice(body.region, body.soil, weather, fallbackAdvice);

  return NextResponse.json(advice);
}

async function buildAiAdvice(
  regionKey: RegionKey,
  soilKey: SoilKey,
  weather: AdviceResult["weather"],
  fallbackAdvice: AdviceResult
): Promise<AdviceResult> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!geminiApiKey) {
    return fallbackAdvice;
  }

  try {
    const region = regions[regionKey];
    const soil = soils[soilKey];
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${
        process.env.GEMINI_MODEL || "gemini-2.5-flash"
      }:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": geminiApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: [
                  "Siz Smart Dehqon Assistant recommendation engine'siz.",
                  "Faqat JSON qaytaring. Markdown, izoh yoki kod fence yozmang.",
                  "JSON AdviceResult formatiga to'liq mos bo'lsin.",
                  "regionName, soilName, soilDescription, climate, season, crops, irrigation, weather maydonlari bo'lsin.",
                  "crops ichida aynan 3 ta tavsiya bo'lsin.",
                  "Javob o'zbek tilida bo'lsin.",
                  "Tavsiyalar amaliy, ehtiyotkor va fermer uchun aniq bo'lsin.",
                  "Faqat berilgan hudud, tuproq, mavsum va ob-havo kontekstidan foydalaning.",
                  "Mos bo'lmasa ham fallback strukturasini buzmay, realistik tavsiya yozing.",
                  "weather maydoni berilgan qiymatlar bilan aynan saqlansin."
                ].join(" ")
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify(
                    {
                      task: "Dashboard uchun AI tavsiya generatsiya qiling",
                      region: region.name,
                      regionClimate: region.climate,
                      soil: soil.name,
                      soilDescription: soil.description,
                      weather,
                      fallbackAdvice
                    },
                    null,
                    2
                  )
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: {
        content?: {
          parts?: { text?: string }[];
        };
      }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

    if (!text) {
      return fallbackAdvice;
    }

    const parsed = JSON.parse(stripJsonFence(text)) as AdviceResult;

    if (!isValidAdviceResult(parsed)) {
      return fallbackAdvice;
    }

    return {
      ...parsed,
      weather
    };
  } catch {
    return fallbackAdvice;
  }
}

function stripJsonFence(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
}

function isValidAdviceResult(value: AdviceResult | null | undefined): value is AdviceResult {
  if (!value) return false;

  return Boolean(
    typeof value.regionName === "string" &&
      typeof value.soilName === "string" &&
      typeof value.soilDescription === "string" &&
      typeof value.climate === "string" &&
      typeof value.season === "string" &&
      Array.isArray(value.crops) &&
      value.crops.length === 3 &&
      value.crops.every(
        (crop) =>
          typeof crop.name === "string" &&
          typeof crop.season === "string" &&
          typeof crop.window === "string" &&
          typeof crop.note === "string" &&
          typeof crop.canPlantNow === "boolean" &&
          typeof crop.timingText === "string"
      ) &&
      typeof value.irrigation?.title === "string" &&
      typeof value.irrigation?.detail === "string" &&
      typeof value.irrigation?.shouldWater === "boolean" &&
      typeof value.weather?.temperature === "number" &&
      typeof value.weather?.rainProbability === "number" &&
      typeof value.weather?.source === "string"
  );
}
