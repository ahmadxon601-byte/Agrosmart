"use client";

import { useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/app/components/sidebar";
import { regions, soils, type RegionKey, type SoilKey } from "@/lib/agro-data";
import type { AdviceResult } from "@/lib/advice";

import styles from "./summary.module.css";

const regionKeys = Object.keys(regions) as RegionKey[];
const soilKeys = Object.keys(soils) as SoilKey[];

export default function SummaryPage() {
  const [region, setRegion] = useState<RegionKey>("toshkent");
  const [soil, setSoil] = useState<SoilKey>("boz");
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ region, soil })
        });

        if (!response.ok) {
          throw new Error("Xulosa sahifasi uchun ma'lumot olinmadi.");
        }

        const data = (await response.json()) as AdviceResult;

        if (!cancelled) {
          setAdvice(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Noma'lum xatolik.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [region, soil]);

  const summaryCards = useMemo(() => buildSummaryCards(advice), [advice]);

  return (
    <main className="dashboard-shell">
      <section className="app-frame">
        <Sidebar />

        <section className={styles.page}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>AgroSmart Xulosa</p>
              <h1 className={styles.title}>Maydon bo&apos;yicha yakuniy holatni bir joyda ko&apos;ring</h1>
              <p className={styles.description}>
                Bu sahifa hudud, tuproq va ob-havo asosidagi yakuniy signalni qisqa va tushunarli ko&apos;rsatadi.
                Foydalanuvchi kirganda bir qarashda nima yaxshi, nima xavfli va nima ustuvorligini biladi.
              </p>
            </div>

            <div className={styles.controlPanel}>
              <label className={styles.selectField}>
                <span>Hudud</span>
                <select value={region} onChange={(event) => setRegion(event.target.value as RegionKey)}>
                  {regionKeys.map((key) => (
                    <option key={key} value={key}>
                      {regions[key].name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.selectField}>
                <span>Tuproq</span>
                <select value={soil} onChange={(event) => setSoil(event.target.value as SoilKey)}>
                  {soilKeys.map((key) => (
                    <option key={key} value={key}>
                      {soils[key].name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={styles.topGrid}>
            <article className={styles.leadCard}>
              <small>Yakuniy signal</small>
              <strong>{loading ? "..." : buildLeadSignal(advice)}</strong>
              <p>{loading ? "Xulosa tayyorlanmoqda." : buildLeadDetail(advice)}</p>

              <div className={styles.badgeRow}>
                <span>{advice?.regionName ?? "..."}</span>
                <span>{advice?.soilName ?? "..."}</span>
                <span>{advice?.season ?? "..."}</span>
              </div>
            </article>

            <article className={styles.weatherCard}>
              <small>Tez ko&apos;rsatkich</small>
              <div className={styles.weatherStats}>
                <div>
                  <span>Harorat</span>
                  <strong>{advice ? `${Math.round(advice.weather.temperature)}°C` : "..."}</strong>
                </div>
                <div>
                  <span>Yomg&apos;ir</span>
                  <strong>{advice ? `${Math.round(advice.weather.rainProbability)}%` : "..."}</strong>
                </div>
                <div>
                  <span>Suv rejasi</span>
                  <strong>{advice?.irrigation.shouldWater ? "Faol" : "Yengil"}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className={styles.contentGrid}>
            <article className={styles.summaryCard}>
              <div className={styles.sectionHead}>
                <div>
                  <p>Asosiy xulosalar</p>
                  <h2>Bugungi umumiy manzara</h2>
                </div>
              </div>

              <div className={styles.cardGrid}>
                {summaryCards.map((card) => (
                  <article key={card.title} className={styles.infoCard}>
                    <small>{card.label}</small>
                    <strong>{card.title}</strong>
                    <p>{card.detail}</p>
                  </article>
                ))}
              </div>
            </article>

            <aside className={styles.sideColumn}>
              <article className={styles.sideCard}>
                <div className={styles.sectionHead}>
                  <div>
                    <p>Asosiy ekinlar</p>
                    <h2>Mos ro&apos;yxat</h2>
                  </div>
                </div>

                <div className={styles.cropList}>
                  {(advice?.crops ?? []).map((crop) => (
                    <article key={crop.name} className={styles.cropItem}>
                      <div>
                        <strong>{crop.name}</strong>
                        <p>{crop.window}</p>
                      </div>
                      <span className={crop.canPlantNow ? styles.goodBadge : styles.waitBadge}>
                        {crop.canPlantNow ? "Mos" : "Kutish"}
                      </span>
                    </article>
                  ))}
                </div>
              </article>

              <article className={styles.sideCard}>
                <div className={styles.sectionHead}>
                  <div>
                    <p>Keyingi qadam</p>
                    <h2>Amaliy eslatma</h2>
                  </div>
                </div>

                <div className={styles.noteList}>
                  <div>
                    <small>1</small>
                    <p>{advice?.irrigation.detail ?? "Sug'orish bo'yicha tavsiya kutilmoqda."}</p>
                  </div>
                  <div>
                    <small>2</small>
                    <p>
                      {advice?.crops[0]
                        ? `${advice.crops[0].name} uchun ${advice.crops[0].window} oralig'ini ustuvor kuzating.`
                        : "Asosiy ekin bo'yicha oynani kuzating."}
                    </p>
                  </div>
                  <div>
                    <small>3</small>
                    <p>{advice?.climate ?? "Hudud bo'yicha iqlim tavsifi kutilmoqda."}</p>
                  </div>
                </div>

                {error ? <p className={styles.error}>{error}</p> : null}
              </article>
            </aside>
          </section>
        </section>
      </section>
    </main>
  );
}

function buildLeadSignal(advice: AdviceResult | null) {
  if (!advice) return "Hisoblanmoqda";
  if (advice.irrigation.shouldWater) return "Harorat yuqori, suv rejasi muhim";
  if (advice.crops[0]?.canPlantNow) return "Ekish uchun sharoit yomon emas";
  return "Kuzatuv va tayyorgarlik rejimi";
}

function buildLeadDetail(advice: AdviceResult | null) {
  if (!advice) return "Hudud va tuproq asosida yakuniy tavsiya tayyorlanmoqda.";

  return `${advice.regionName} hududida ${advice.soilName.toLowerCase()} uchun asosiy yo'nalish: ${
    advice.crops[0]?.name ?? "ekin tanlanmoqda"
  }. ${advice.irrigation.title}.`;
}

function buildSummaryCards(advice: AdviceResult | null) {
  if (!advice) {
    return [
      { label: "Holat", title: "Ma'lumot olinmoqda", detail: "Yakuniy signal tayyorlanmoqda." },
      { label: "Risk", title: "Tahlil ketmoqda", detail: "Asosiy xavf omillari hisoblanmoqda." },
      { label: "Yo'nalish", title: "Kutilmoqda", detail: "Hudud va tuproq bo'yicha mos yo'nalish topilmoqda." }
    ];
  }

  return [
    {
      label: "Holat",
      title: advice.irrigation.shouldWater ? "Faol nazorat kerak" : "Barqaror holat",
      detail: advice.irrigation.detail
    },
    {
      label: "Risk",
      title: advice.weather.rainProbability >= 60 ? "Namlik xavfi" : "Past xavf",
      detail: `${Math.round(advice.weather.rainProbability)}% yomg'ir ehtimoli va ${Math.round(
        advice.weather.temperature
      )}°C harorat kuzatilmoqda.`
    },
    {
      label: "Yo'nalish",
      title: advice.crops[0]?.name ?? "Asosiy ekin",
      detail: advice.crops[0]?.timingText ?? "Asosiy ekin bo'yicha tavsiya tayyorlanmoqda."
    }
  ];
}
