import { apiFetch } from "~/api/client";
import { ApiError } from "~/api/errors";
import { MOCK_OFFICIAL_CARDS } from "./mock";
import type { OfficialCardDetail, OfficialCardSummary } from "./types";

/** 백엔드 대신 임시 응답을 쓸지. 백엔드 API가 열리면 이 플래그와 mock을 함께 지운다. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/** `공식 카드` 목록. */
export async function fetchOfficialCards(): Promise<OfficialCardSummary[]> {
  if (USE_MOCK) {
    return MOCK_OFFICIAL_CARDS.map(toSummary);
  }
  return apiFetch<OfficialCardSummary[]>("/api/official-cards");
}

/** `공식 카드` 상세 — 요약 + `강도` 단계별 고지 문구. */
export async function fetchOfficialCard(
  cardId: string,
): Promise<OfficialCardDetail> {
  if (USE_MOCK) {
    const found = MOCK_OFFICIAL_CARDS.find((card) => card.id === cardId);
    if (!found) {
      throw new ApiError(404, "CARD_NOT_FOUND", "카드를 찾을 수 없습니다.");
    }
    return found;
  }
  return apiFetch<OfficialCardDetail>(
    `/api/official-cards/${encodeURIComponent(cardId)}`,
  );
}

function toSummary(card: OfficialCardDetail): OfficialCardSummary {
  const { intensityNotices, ...summary } = card;
  return summary;
}
