"use client";

import { useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/app/components/sidebar";
import { regions, soils, type RegionKey, type SoilKey } from "@/lib/agro-data";
import type { AdviceResult } from "@/lib/advice";

import styles from "./plan.module.css";

const regionKeys = Object.keys(regions) as RegionKey[];
const soilKeys = Object.keys(soils) as SoilKey[];

export default function PlanPage() {
  const [region, setRegion] = useState<RegionKey>("toshkent");
  const [soil, setSoil] = useState<SoilKey>("boz");
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPlan() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ region, soil })
        });

        if (!response.ok) {
          throw new Error("Rejani olishda xatolik yuz berdi.");
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

    void loadPlan();

    return () => {
      cancelled = true;
    };
  }, [region, soil]);

  const planSteps = useMemo(() => buildPlanSteps(advice), [advice]);
  const leadCrop = advice?.crops[0] ?? null;

  return (
    <main className="dashboard-shell">
      <section className="app-frame">
        <Sidebar />

        <section className={styles.page}>
          <section className={styles.hero}>
            <div className={styles.heroTop}>
              <div>
                <p className={styles.kicker}>AgroSmart Reja</p>
                <h1 className={styles.title}>Bugungi ishni reja asosida boshqaring</h1>
                <p className={styles.description}>
                  Hudud, tuproq va ob-havo bo&apos;yicha ustuvor vazifalarni bir joyda ko&apos;ring. Sahifa bir qarashda
                  nimani hozir qilish kerakligini ko&apos;rsatadi.
                </p>
              </div>

              <div className={styles.filterPanel}>
                <label className={styles.field}>
                  <span>Hudud</span>
                  <select value={region} onChange={(event) => setRegion(event.target.value as RegionKey)}>
                    {regionKeys.map((key) => (
                      <option key={key} value={key}>
                        {regions[key].name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
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
            </div>

            <div className={styles.heroGrid}>
              <article className={styles.primaryCard}>
                <small>Asosiy ekin</small>
                <strong>{loading ? "..." : leadCrop?.name ?? "Tanlanmadi"}</strong>
                <p>
                  {loading
                    ? "Reja hisoblanmoqda."
                    : leadCrop?.timingText ?? "Hudud va tuproq asosida asosiy yo'nalish ko'rsatiladi."}
                </p>
                <div className={styles.tagRow}>
                  <span>{advice?.season ?? "..."}</span>
                  <span>{advice?.regionName ?? "..."}</span>
                  <span>{advice?.soilName ?? "..."}</span>
                </div>
              </article>

              <article className={styles.statusCard}>
                <small>Bugungi status</small>
                <strong>{loading ? "..." : advice?.irrigation.title ?? "Reja yuklanmoqda"}</strong>
                <p>{loading ? "..." : advice?.irrigation.detail ?? "Ma'lumot kutilmoqda."}</p>
              </article>

              <article className={styles.metaCard}>
                <small>Iqlim eslatmasi</small>
                <strong>{regions[region].name}</strong>
                <p>{advice?.climate ?? regions[region].climate}</p>
              </article>
            </div>
          </section>

          <section className={styles.contentGrid}>
            <article className={styles.planCard}>
              <div className={styles.sectionHead}>
                <div>
                  <p>Kun rejasi</p>
                  <h2>3 ta ustuvor qadam</h2>
                </div>
                <span>{loading ? "..." : buildPriorityLabel(advice)}</span>
              </div>

              <div className={styles.stepList}>
                {planSteps.map((step, index) => (
                  <article key={step.title} className={styles.stepCard}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </article>
                ))}
              </div>
            </article>

            <aside className={styles.sideColumn}>
              <article className={styles.timelineCard}>
                <div className={styles.sectionHead}>
                  <div>
                    <p>Ekish oynasi</p>
                    <h2>Mos variantlar</h2>
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
                        {crop.canPlantNow ? "Hozir mos" : "Kutish kerak"}
                      </span>
                    </article>
                  ))}
                </div>
              </article>

              <article className={styles.riskCard}>
                <div className={styles.sectionHead}>
                  <div>
                    <p>Risk va nazorat</p>
                    <h2>Bugun kuzatish</h2>
                  </div>
                </div>

                <div className={styles.riskList}>
                  <div>
                    <small>Harorat</small>
                    <strong>{advice ? `${Math.round(advice.weather.temperature)}°C` : "..."}</strong>
                  </div>
                  <div>
                    <small>Yomg&apos;ir</small>
                    <strong>{advice ? `${Math.round(advice.weather.rainProbability)}%` : "..."}</strong>
                  </div>
                  <div>
                    <small>Sug&apos;orish</small>
                    <strong>{advice?.irrigation.shouldWater ? "Kerak" : "Shart emas"}</strong>
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

function buildPlanSteps(advice: AdviceResult | null) {
  if (!advice) {
    return [
      { title: "Ma'lumot olinmoqda", detail: "Hudud va tuproq asosida reja tayyorlanmoqda." },
      { title: "Ob-havo tekshirilmoqda", detail: "Harorat va yomg'ir xavfi tahlil qilinmoqda." },
      { title: "Tavsiya ishlab chiqilmoqda", detail: "Ustuvor ishlar ro'yxati tayyorlanmoqda." }
    ];
  }

  const leadCrop = advice.crops[0];

  return [
    {
      title: leadCrop?.canPlantNow ? "Ekish maydonini tayyorlang" : "Ekish vaqtini kuzating",
      detail: leadCrop
        ? `${leadCrop.name} uchun oynasi: ${leadCrop.window}. ${leadCrop.timingText}`
        : "Asosiy ekin bo'yicha tavsiya kutilmoqda."
    },
    {
      title: "Sug'orish qarorini belgilang",
      detail: advice.irrigation.detail
    },
    {
      title: "Kundalik nazoratni yopib chiqing",
      detail: `${advice.regionName} hududida ${advice.soilName.toLowerCase()} bo'yicha shamol, namlik va yer holatini tekshiring.`
    }
  ];
}

function buildPriorityLabel(advice: AdviceResult | null) {
  if (!advice) return "Hisoblanmoqda";
  if (advice.irrigation.shouldWater) return "Suv rejasi ustuvor";
  if (advice.crops[0]?.canPlantNow) return "Ekish oynasi ochiq";
  return "Kuzatuv rejimi";
}
