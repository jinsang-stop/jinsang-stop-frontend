/**
 * `세션 리포트` 관련 타입.
 *
 * 필드 모양은 백엔드 `GET /api/training-sessions/{sessionId}/report`(슬라이스
 * jinsang-stop/jinsang-stop#8)와 같다. 진정 조건·양보 불가선·"올바른 조치"
 * 항목은 없고, 세 축을 합친 점수도 없다(ADR-0002 · ADR-0004).
 */

import type { Intensity } from "~/officialCard/types";
import type {
  AttitudeAxis,
  TrainingSessionStatus,
  TurnScore,
} from "~/trainingSession/types";

/** 리포트의 턴 한 줄. */
export type ReportTurn = {
  turnNumber: number;
  userTranscript: string;
  complainantLine: string;
  calmed: boolean;
  /** 축별 점수·근거, 또는 `정보 없음`(`FAILED` · `PENDING`). */
  score: TurnScore;
};

/** 성장 기록 미편입 사유 코드. 여러 개가 함께 붙을 수 있다. */
export type ExclusionReasonCode =
  | "NOT_CALMED"
  | "UNSCORED_TURNS"
  | "BOUNDARY_BELOW_THRESHOLD"
  | "BOUNDARY_THRESHOLD_UNSET";

export type GrowthRecordStatus = {
  /** 성장 기록에 들어갔는가. */
  included: boolean;
  /** 미편입 사유(편입이면 빈 배열). 문구는 백엔드가 내려준다. */
  reasons: { code: ExclusionReasonCode; message: string }[];
};

export type SessionReport = {
  sessionId: number;
  cardId: number;
  cardName: string;
  complainantRoleName: string;
  intensity: Intensity;
  /** 종료 사유 — `IN_PROGRESS`는 오지 않는다. */
  endReason: Exclude<TrainingSessionStatus, "IN_PROGRESS">;
  /** 진정 종료일 때만 값이 있다(성장의 주지표). */
  turnsToCalm: number | null;
  startedAt: string;
  endedAt: string;
  /** 턴 번호 순. */
  turns: ReportTurn[];
  /** 축별 평균(채점된 턴 기준, 보조 지표). 채점된 턴이 없으면 `null`. 합산하지 않는다. */
  axisAverages: Record<AttitudeAxis, number | null>;
  growthRecord: GrowthRecordStatus;
};

/** 아직 진행 중인 세션의 리포트를 요청했을 때 오는 오류 코드. */
export const REPORT_NOT_READY_CODE = "TRAINING_SESSION_IN_PROGRESS";

/**
 * 같은 카드·같은 강도로 재도전하는 경로. 2단계 이상은 고지 확인을 다시 거치도록
 * 세션으로 바로 보내지 않고 강도를 골라 둔 카드 화면으로 보낸다.
 */
export function retryPath(cardId: number, intensity: Intensity): string {
  return `/cards/${cardId}?intensity=${intensity}`;
}
