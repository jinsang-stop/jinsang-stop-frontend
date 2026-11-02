import { ApiError } from "~/api/errors";
import { MOCK_OFFICIAL_CARDS } from "~/officialCard/mock";
import { mockSessionRecords } from "~/trainingSession/mock";
import { ATTITUDE_AXES } from "~/trainingSession/types";
import type { AttitudeAxis, TurnScore } from "~/trainingSession/types";
import { REPORT_NOT_READY_CODE } from "./types";
import type { GrowthRecordStatus, SessionReport } from "./types";

/**
 * 백엔드 없이 리포트 화면을 보기 위한 임시 구현. `VITE_USE_MOCK_API=true`일 때만
 * 쓰인다. 세션 목업이 남긴 턴으로 리포트를 만들고, 편입 판정은 백엔드 규칙
 * (진정 종료 · 채점 안 된 턴 없음 · 경계 설정 하한선)을 흉내 낸다.
 */
export const MOCK_BOUNDARY_THRESHOLD = 3;

const REASON_MESSAGES = {
  NOT_CALMED: "진정 종료로 끝나지 않은 훈련은 성장 기록에 들어가지 않아요.",
  UNSCORED_TURNS: "채점되지 않은 턴이 있어 성장 기록에 넣지 않았어요.",
  BOUNDARY_BELOW_THRESHOLD:
    "경계 설정 점수가 기준에 못 미쳐 성장 기록에 넣지 않았어요. 요구를 들어줘서 빨리 끝내는 것은 성장으로 보지 않아요.",
} as const;

export async function mockFetchSessionReport(
  sessionId: number,
): Promise<SessionReport> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const record = mockSessionRecords().find(
    (it) => it.session.sessionId === sessionId,
  );
  if (!record) {
    throw new ApiError(404, "TRAINING_SESSION_NOT_FOUND", "훈련 세션을 찾을 수 없습니다.");
  }
  const { session, turns } = record;
  if (session.status === "IN_PROGRESS") {
    throw new ApiError(
      409,
      REPORT_NOT_READY_CODE,
      "아직 진행 중인 훈련입니다. 훈련이 끝나면 리포트를 볼 수 있어요.",
    );
  }
  const card = MOCK_OFFICIAL_CARDS.find((it) => it.cardId === session.cardId);
  const scores = turns.map((turn) => turn.score);
  const axisAverages = averages(scores);
  return {
    sessionId,
    cardId: session.cardId,
    cardName: card?.name ?? "",
    complainantRoleName: session.complainantRoleName,
    intensity: session.intensity,
    endReason: session.status,
    turnsToCalm: session.turnsToCalm,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? new Date().toISOString(),
    turns,
    axisAverages,
    growthRecord: eligibility(session.status === "CALMED", scores, axisAverages),
  };
}

function averages(scores: TurnScore[]): Record<AttitudeAxis, number | null> {
  const scored = scores.filter((it) => it.status === "SCORED");
  const entries = ATTITUDE_AXES.map(({ axis }) => {
    if (scored.length === 0) {
      return [axis, null] as const;
    }
    const sum = scored.reduce((acc, it) => acc + (it[axis]?.score ?? 0), 0);
    return [axis, Math.round((sum / scored.length) * 100) / 100] as const;
  });
  return Object.fromEntries(entries) as Record<AttitudeAxis, number | null>;
}

function eligibility(
  calmed: boolean,
  scores: TurnScore[],
  axisAverages: Record<AttitudeAxis, number | null>,
): GrowthRecordStatus {
  const reasons: GrowthRecordStatus["reasons"] = [];
  if (!calmed) {
    reasons.push({ code: "NOT_CALMED", message: REASON_MESSAGES.NOT_CALMED });
  }
  if (scores.some((it) => it.status !== "SCORED")) {
    reasons.push({ code: "UNSCORED_TURNS", message: REASON_MESSAGES.UNSCORED_TURNS });
  }
  const boundary = axisAverages.boundarySetting;
  if (boundary !== null && boundary < MOCK_BOUNDARY_THRESHOLD) {
    reasons.push({
      code: "BOUNDARY_BELOW_THRESHOLD",
      message: REASON_MESSAGES.BOUNDARY_BELOW_THRESHOLD,
    });
  }
  return { included: reasons.length === 0, reasons };
}
