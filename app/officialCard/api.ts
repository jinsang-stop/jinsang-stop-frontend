import { apiFetch } from "~/api/client";
import { ApiError } from "~/api/errors";
import { MOCK_INTENSITY_GUIDE, MOCK_OFFICIAL_CARDS } from "./mock";
import type { IntensityGuide, OfficialCard } from "./types";

/** 백엔드 대신 임시 응답을 쓸지. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/** `공식 카드` 목록. */
export async function fetchOfficialCards(): Promise<OfficialCard[]> {
  if (USE_MOCK) {
    return MOCK_OFFICIAL_CARDS;
  }
  return apiFetch<OfficialCard[]>("/api/cards");
}

/** `공식 카드` 상세 — 새로고침·직접 주소 진입 때도 다시 받는다. */
export async function fetchOfficialCard(
  cardId: string | number,
): Promise<OfficialCard> {
  if (USE_MOCK) {
    const found = MOCK_OFFICIAL_CARDS.find(
      (card) => String(card.cardId) === String(cardId),
    );
    if (!found) {
      throw new ApiError(404, "CARD_NOT_FOUND", "시나리오 카드를 찾을 수 없습니다.");
    }
    return found;
  }
  return apiFetch<OfficialCard>(
    `/api/cards/${encodeURIComponent(String(cardId))}`,
  );
}

/** `강도` 단계별 고지 — 카드와 상관없이 같다. */
export async function fetchIntensityGuide(): Promise<IntensityGuide> {
  if (USE_MOCK) {
    return MOCK_INTENSITY_GUIDE;
  }
  return apiFetch<IntensityGuide>("/api/intensities");
}
