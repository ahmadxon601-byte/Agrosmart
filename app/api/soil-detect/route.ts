import { NextResponse } from "next/server";

import { soils, type SoilKey } from "@/lib/agro-data";

type SoilDetection = {
  soil: SoilKey;
  confidence: number;
  reason: string;
  mode: "ai" | "fallback";
};

const soilKeys = Object.keys(soils) as SoilKey[];

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Tuproq rasmi yuborilmadi." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${bytes.toString("base64")}`;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(buildFallbackDetection(file.name));
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "Siz agronom yordamchisiz. Tuproq rasmini baholab faqat quyidagi JSON formatda javob bering: {\"soil\":\"boz|qumli|shorxok\",\"confidence\":0-100,\"reason\":\"qisqa sabab\"}. Faqat shu uch turdan birini tanlang. Bu laboratoriya tahlili emas, taxminiy vizual baho ekanini sababda qisqa ayting."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Rasmga qarab tuproq turini aniqlang: bo'z, qumli yoki sho'rxok."
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI vision failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseDetection(content);

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(buildFallbackDetection(file.name));
  }
}

function parseDetection(content: string): SoilDetection {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? content) as Partial<SoilDetection>;
  const soil = parsed.soil && soilKeys.includes(parsed.soil) ? parsed.soil : "boz";

  return {
    soil,
    confidence: clampConfidence(parsed.confidence),
    reason:
      typeof parsed.reason === "string" && parsed.reason.trim()
        ? parsed.reason.trim()
        : "Rasm asosida taxminiy vizual baho berildi.",
    mode: "ai"
  };
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 68;
  return Math.max(1, Math.min(100, Math.round(value)));
}

function buildFallbackDetection(fileName: string): SoilDetection {
  const lower = fileName.toLowerCase();

  if (/qum|sand|sandy/.test(lower)) {
    return {
      soil: "qumli",
      confidence: 55,
      reason: "API kalit topilmadi. Fayl nomidagi belgi asosida qumli tuproq deb taxmin qilindi.",
      mode: "fallback"
    };
  }

  if (/sho|shor|salt|saline/.test(lower)) {
    return {
      soil: "shorxok",
      confidence: 55,
      reason: "API kalit topilmadi. Fayl nomidagi belgi asosida sho'rxok tuproq deb taxmin qilindi.",
      mode: "fallback"
    };
  }

  return {
    soil: "boz",
    confidence: 50,
    reason: "API kalit topilmadi. Default taxmin sifatida bo'z tuproq tanlandi.",
    mode: "fallback"
  };
}
