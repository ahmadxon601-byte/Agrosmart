import { NextResponse } from "next/server";

import { buildAdvice, buildRuleBasedChatAnswer, type AdviceResult } from "@/lib/advice";
import { regions, soils, type RegionKey, type SoilKey } from "@/lib/agro-data";
import { getWeather } from "@/lib/weather";

type ChatRequest = {
  question?: string;
  region?: RegionKey;
  soil?: SoilKey;
  advice?: AdviceResult;
  history?: {
    role: "user" | "assistant";
    content: string;
  }[];
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChatRequest | null;

  if (!body?.question?.trim()) {
    return NextResponse.json({ error: "Savol yozing." }, { status: 400 });
  }

  const region = body.region && body.region in regions ? body.region : "toshkent";
  const soil = body.soil && body.soil in soils ? body.soil : "boz";
  const advice = body.advice ?? buildAdvice(region, soil, await getWeather(region));
  const fallback = buildRuleBasedChatAnswer(body.question, advice);
  const historyText = (body.history ?? [])
    .slice(-6)
    .map((message) => `${message.role === "user" ? "Foydalanuvchi" : "Assistant"}: ${message.content}`)
    .join("\n");
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!geminiApiKey && !apiKey) {
    return NextResponse.json({ answer: fallback, mode: "rule-based" });
  }

  if (geminiApiKey) {
    try {
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
                    "Siz Smart Dehqon Assistant yordamchisisiz.",
                    "Faqat o'zbek tilida javob bering.",
                    "Javob qisqa, amaliy, tushunarli va fermer uchun foydali bo'lsin.",
                    "Faqat dehqonchilik, tuproq, ekin, mavsum, sug'orish va ob-havo mavzusida qoling.",
                    "Kontekstda berilgan hudud, tuproq, mavsum va ob-havo ma'lumotlaridan tashqariga chiqib taxmin qilmang.",
                    "Tibbiy, huquqiy yoki moliyaviy maslahat bermang.",
                    "Javobda keraksiz kirish so'zlari, bezak va umumiy gaplarni kamaytiring.",
                    "Avval aniq tavsiya bering, keyin zarur bo'lsa 1-2 sabab yozing."
                  ].join(" ")
                }
              ]
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Kontekst: ${JSON.stringify(advice)}\n\nSuhbat tarixi:\n${
                      historyText || "Hali yo'q"
                    }\n\nSavol: ${body.question}`
                  }
                ]
              }
            ]
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
      const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

      return NextResponse.json({ answer: answer || fallback, mode: answer ? "ai" : "rule-based" });
    } catch {
      return NextResponse.json({ answer: fallback, mode: "rule-based" });
    }
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Siz Smart Dehqon Assistant yordamchisisiz. Faqat o'zbek tilida, qisqa, amaliy va tushunarli javob bering. Tibbiy yoki moliyaviy maslahat bermang. Fermerga tuproq, mavsum va ob-havo asosida ehtiyotkor tavsiya bering."
          },
          {
            role: "user",
            content: `Kontekst: ${JSON.stringify(advice)}\n\nSuhbat tarixi:\n${
              historyText || "Hali yo'q"
            }\n\nSavol: ${body.question}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const answer = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ answer: answer || fallback, mode: answer ? "ai" : "rule-based" });
  } catch {
    return NextResponse.json({ answer: fallback, mode: "rule-based" });
  }
}
