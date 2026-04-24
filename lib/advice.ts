import { crops, getCurrentSeason, regions, seasonLabels, soils, type RegionKey, type SoilKey } from "./agro-data";

export type WeatherSnapshot = {
  temperature: number;
  rainProbability: number;
  source: string;
};

export type AdviceResult = {
  regionName: string;
  soilName: string;
  soilDescription: string;
  climate: string;
  season: string;
  crops: {
    name: string;
    season: string;
    window: string;
    note: string;
    canPlantNow: boolean;
    timingText: string;
  }[];
  irrigation: {
    title: string;
    detail: string;
    shouldWater: boolean;
  };
  weather: WeatherSnapshot;
};

export function buildAdvice(regionKey: RegionKey, soilKey: SoilKey, weather: WeatherSnapshot, date = new Date()): AdviceResult {
  const region = regions[regionKey];
  const soil = soils[soilKey];
  const currentSeason = getCurrentSeason(date);
  const recommendedCrops = soil.cropKeys.slice(0, 3).map((cropKey) => {
    const crop = crops[cropKey];
    const canPlantNow = crop.season === currentSeason;

    return {
      name: crop.name,
      season: seasonLabels[crop.season],
      window: crop.window,
      note: crop.note,
      canPlantNow,
      timingText: canPlantNow
        ? "Hozir ekish mumkin."
        : `Hozir asosiy mavsum emas. Eng yaxshi vaqt: ${crop.window}.`
    };
  });

  const shouldWater = weather.temperature >= 30 && weather.rainProbability < 35;
  const coolAndRainy = weather.temperature < 22 && weather.rainProbability >= 50;

  let title = "Bugun yengil sug'orish kifoya";
  let detail = "Namlikni tekshirib, tuproq qurigan bo'lsa kechki payt me'yorida suv bering.";

  if (shouldWater) {
    title = "Bugun sug'orish kerak";
    detail = "Harorat yuqori va yomg'ir ehtimoli past. Ertalab yoki kechqurun sug'orish tavsiya etiladi.";
  } else if (coolAndRainy) {
    title = "Bugun sug'orish shart emas";
    detail = "Havo salqin va yomg'ir ehtimoli bor. Ortiqcha suv ildizga zarar qilishi mumkin.";
  } else if (weather.rainProbability >= 60) {
    title = "Yomg'ir kutilmoqda";
    detail = "Sug'orishni keyinga qoldiring va yomg'irdan keyin tuproq namligini qayta baholang.";
  }

  return {
    regionName: region.name,
    soilName: soil.name,
    soilDescription: soil.description,
    climate: region.climate,
    season: seasonLabels[currentSeason],
    crops: recommendedCrops,
    irrigation: {
      title,
      detail,
      shouldWater
    },
    weather
  };
}

export function buildRuleBasedChatAnswer(question: string, advice: AdviceResult): string {
  const normalized = question.toLowerCase();
  const crop = advice.crops.find((item) => normalized.includes(item.name.toLowerCase().replace("'", "")));
  const asksWater = /sug|suv|sug'or|sugor|yomg/.test(normalized);
  const asksPlanting = /ek|ekin|qachon|bo'ladimi|boladimi|tavsiya/.test(normalized);

  if (asksWater) {
    return `${advice.irrigation.title}. ${advice.irrigation.detail} Hozirgi harorat ${Math.round(
      advice.weather.temperature
    )}°C, yomg'ir ehtimoli ${Math.round(advice.weather.rainProbability)}%.`;
  }

  if (crop) {
    return `${crop.name} uchun tavsiya: ${crop.timingText} Odatdagi ekish oynasi: ${crop.window}. ${crop.note}`;
  }

  if (asksPlanting) {
    const cropList = advice.crops.map((item) => item.name).join(", ");
    return `${advice.soilName} va ${advice.regionName} hududi uchun hozircha mos ekinlar: ${cropList}. ${advice.crops[0]?.timingText ?? ""}`;
  }

  return `${advice.regionName} hududida ${advice.soilName.toLowerCase()} uchun ${advice.crops
    .map((item) => item.name)
    .join(", ")} tavsiya qilinadi. Sug'orish bo'yicha: ${advice.irrigation.title.toLowerCase()}.`;
}
