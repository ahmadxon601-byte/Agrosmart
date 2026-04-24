export type RegionKey =
  | "andijon"
  | "buxoro"
  | "fargona"
  | "jizzax"
  | "namangan"
  | "navoiy"
  | "qashqadaryo"
  | "qoraqalpogiston"
  | "samarqand"
  | "sirdaryo"
  | "surxondaryo"
  | "toshkent"
  | "xorazm";

export type SoilKey = "boz" | "qumli" | "shorxok";
export type SeasonKey = "bahor" | "yoz" | "kuz" | "qish";

export type Crop = {
  key: string;
  name: string;
  season: SeasonKey;
  window: string;
  note: string;
};

export const regions: Record<
  RegionKey,
  { name: string; lat: number; lon: number; climate: string }
> = {
  andijon: { name: "Andijon", lat: 40.7821, lon: 72.3442, climate: "Vodiy, sug'oriladigan dehqonchilik kuchli." },
  buxoro: { name: "Buxoro", lat: 39.7747, lon: 64.4286, climate: "Issiq va quruq, suv rejasi muhim." },
  fargona: { name: "Farg'ona", lat: 40.3894, lon: 71.7843, climate: "Vodiy, sabzavot va poliz uchun qulay." },
  jizzax: { name: "Jizzax", lat: 40.1158, lon: 67.8422, climate: "Dasht hududi, shamol va namlikka e'tibor kerak." },
  namangan: { name: "Namangan", lat: 40.9983, lon: 71.6726, climate: "Vodiy, intensiv ekinlar uchun mos." },
  navoiy: { name: "Navoiy", lat: 40.1039, lon: 65.3688, climate: "Quruq iqlim, sho'rlanish xavfi bor." },
  qashqadaryo: { name: "Qashqadaryo", lat: 38.861, lon: 65.7847, climate: "Iliq, ertaki ekinlar uchun qulay." },
  qoraqalpogiston: { name: "Qoraqalpog'iston", lat: 42.4619, lon: 59.6166, climate: "Quruq va sho'rlanishga moyil." },
  samarqand: { name: "Samarqand", lat: 39.6542, lon: 66.9597, climate: "Mo'tadil, bog'dorchilik va g'alla uchun mos." },
  sirdaryo: { name: "Sirdaryo", lat: 40.8436, lon: 68.6617, climate: "Sug'oriladigan maydonlar ko'p." },
  surxondaryo: { name: "Surxondaryo", lat: 37.2242, lon: 67.2783, climate: "Eng iliq hududlardan, ertaki ekish mumkin." },
  toshkent: { name: "Toshkent", lat: 41.2995, lon: 69.2401, climate: "Mo'tadil, sabzavot va g'alla uchun qulay." },
  xorazm: { name: "Xorazm", lat: 41.3565, lon: 60.8567, climate: "Quruq, sug'orish va sho'r yuvish muhim." }
};

export const soils: Record<SoilKey, { name: string; description: string; cropKeys: string[] }> = {
  boz: {
    name: "Bo'z tuproq",
    description: "O'zbekistonda keng tarqalgan, g'alla va texnik ekinlar uchun mos.",
    cropKeys: ["bugdoy", "paxta", "pomidor"]
  },
  qumli: {
    name: "Qumli tuproq",
    description: "Tez qiziydi va suvni tez o'tkazadi, poliz ekinlariga mos.",
    cropKeys: ["tarvuz", "qovun", "sabzi"]
  },
  shorxok: {
    name: "Sho'rxok tuproq",
    description: "Tuz miqdori yuqori, chidamli ekin va sho'r yuvish talab qiladi.",
    cropKeys: ["arpa", "lavlagi", "beda"]
  }
};

export const crops: Record<string, Crop> = {
  bugdoy: {
    key: "bugdoy",
    name: "Bug'doy",
    season: "kuz",
    window: "Sentabr oxiri - noyabr",
    note: "Kuzgi ekishda namlik saqlansa hosildorlik yaxshilanadi."
  },
  paxta: {
    key: "paxta",
    name: "Paxta",
    season: "bahor",
    window: "Aprel - may boshida",
    note: "Tuproq yetarli qiziganda ekish tavsiya etiladi."
  },
  pomidor: {
    key: "pomidor",
    name: "Pomidor",
    season: "bahor",
    window: "Mart oxiri - aprel",
    note: "Ko'chat usulida sovuq xavfi kamaygandan keyin ekiladi."
  },
  tarvuz: {
    key: "tarvuz",
    name: "Tarvuz",
    season: "yoz",
    window: "Aprel oxiri - iyun",
    note: "Qumli tuproqda iliqlik va drenaj yaxshi bo'lsa yaxshi o'sadi."
  },
  qovun: {
    key: "qovun",
    name: "Qovun",
    season: "yoz",
    window: "Aprel oxiri - iyun",
    note: "Suvni me'yorida bering, ortiqcha namlik shirinlikka ta'sir qiladi."
  },
  sabzi: {
    key: "sabzi",
    name: "Sabzi",
    season: "bahor",
    window: "Fevral oxiri - aprel",
    note: "Yengil tuproqda ildizmeva tekis shakllanadi."
  },
  arpa: {
    key: "arpa",
    name: "Arpa",
    season: "kuz",
    window: "Sentabr - noyabr",
    note: "Sho'rlanishga nisbatan chidamliroq g'alla ekini."
  },
  lavlagi: {
    key: "lavlagi",
    name: "Lavlagi",
    season: "bahor",
    window: "Mart - aprel",
    note: "O'rtacha sho'rlanishda ham o'sishi mumkin, lekin suv rejasi muhim."
  },
  beda: {
    key: "beda",
    name: "Beda",
    season: "bahor",
    window: "Mart - aprel",
    note: "Tuproqni yaxshilash va yem-xashak uchun foydali."
  }
};

export const seasonLabels: Record<SeasonKey, string> = {
  bahor: "Bahor",
  yoz: "Yoz",
  kuz: "Kuz",
  qish: "Qish"
};

export function getCurrentSeason(date = new Date()): SeasonKey {
  const month = date.getMonth() + 1;

  if (month >= 3 && month <= 5) return "bahor";
  if (month >= 6 && month <= 8) return "yoz";
  if (month >= 9 && month <= 11) return "kuz";
  return "qish";
}
