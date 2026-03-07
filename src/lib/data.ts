import type { FeatureCollection } from "geojson";

export type Country = {
  code: string;
  name: string;
  region?: string;
  dailyBudgetLow: number;
  dailyBudgetMid: number;
  dailyBudgetHigh: number;
  bestMonths: number[];
  recommendedDaysMin: number;
  recommendedDaysMax: number;
  safetyScore: number;
  dataYear: number;
};

export type POI = {
  id: string;
  name: string;
  daysMin: number;
  daysMax: number;
  type: "city" | "nature" | "culture" | "beach" | "other";
};

export type CountriesMap = Record<string, Country>;
export type PoisMap = Record<string, POI[]>;

export type StaticData = {
  countries: CountriesMap;
  pois: PoisMap;
  geojson: FeatureCollection;
};

export async function loadStaticData(): Promise<StaticData> {
  const [countries, pois, geojson] = await Promise.all([
    fetch("/data/countries.json").then((r) => {
      if (!r.ok) throw new Error(`Failed to load countries.json: ${r.status}`);
      return r.json() as Promise<CountriesMap>;
    }),
    fetch("/data/pois.json").then((r) => {
      if (!r.ok) throw new Error(`Failed to load pois.json: ${r.status}`);
      return r.json() as Promise<PoisMap>;
    }),
    fetch("/geo/countries.geojson").then((r) => {
      if (!r.ok) throw new Error(`Failed to load countries.geojson: ${r.status}`);
      return r.json() as Promise<FeatureCollection>;
    }),
  ]);
  return { countries, pois, geojson };
}
