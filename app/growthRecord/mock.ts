import { ApiError } from "~/api/errors";
import { MOCK_OFFICIAL_CARDS } from "~/officialCard/mock";
import type { Intensity } from "~/officialCard/types";
import { mockFetchSessionReport } from "~/sessionReport/mock";
import { mockSessionRecords } from "~/trainingSession/mock";
import type { GrowthPoint, GrowthRecord } from "./types";

/**
 * 백엔드 없이 성장 기록 화면을 보기 위한 임시 구현. `VITE_USE_MOCK_API=true`일 때만
 * 쓰인다. 세션 목업 중 리포트 목업이 "편입"으로 판정한 세션만 점이 된다.
 */
export async function mockFetchGrowthRecord(
  cardId: number,
  intensity: Intensity,
): Promise<GrowthRecord> {
  const card = MOCK_OFFICIAL_CARDS.find((it) => it.cardId === cardId);
  if (!card) {
    throw new ApiError(404, "CARD_NOT_FOUND", "시나리오 카드를 찾을 수 없습니다.");
  }
  const candidates = mockSessionRecords().filter(
    ({ session }) =>
      session.cardId === cardId &&
      session.intensity === intensity &&
      session.status === "CALMED",
  );
  const points: GrowthPoint[] = [];
  for (const { session } of candidates) {
    const report = await mockFetchSessionReport(session.sessionId);
    const { emotionalStability, empathyAcknowledgement, boundarySetting } =
      report.axisAverages;
    if (
      !report.growthRecord.included ||
      report.turnsToCalm === null ||
      emotionalStability === null ||
      empathyAcknowledgement === null ||
      boundarySetting === null
    ) {
      continue;
    }
    points.push({
      sessionId: session.sessionId,
      endedAt: report.endedAt,
      turnsToCalm: report.turnsToCalm,
      emotionalStability,
      empathyAcknowledgement,
      boundarySetting,
    });
  }
  points.sort((a, b) => a.endedAt.localeCompare(b.endedAt));
  return {
    cardId,
    cardName: card.name,
    intensity,
    boundaryThresholdConfigured: true,
    points,
  };
}
