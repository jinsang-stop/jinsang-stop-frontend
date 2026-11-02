import { apiFetch } from "~/api/client";
import type { Intensity } from "~/officialCard/types";
import { mockFetchGrowthRecord } from "./mock";
import type { GrowthRecord } from "./types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/** 한 카드·한 `강도`의 성장 기록. 점이 없으면 빈 배열이다. */
export async function fetchGrowthRecord(
  cardId: number,
  intensity: Intensity,
): Promise<GrowthRecord> {
  if (USE_MOCK) {
    return mockFetchGrowthRecord(cardId, intensity);
  }
  const query = new URLSearchParams({
    cardId: String(cardId),
    intensity: String(intensity),
  });
  return apiFetch<GrowthRecord>(`/api/growth-records?${query}`);
}
