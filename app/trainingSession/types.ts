/**
 * `훈련 세션` · `발화 턴` · `태도 3축` 관련 타입.
 *
 * 용어 대응 (jinsang-stop/CONTEXT.md → 코드):
 * | 용어 | 식별자 |
 * |---|---|
 * | 훈련 세션 | `TrainingSession` |
 * | 발화 턴 | `UtteranceTurn` |
 * | 민원인 | `complainant` |
 * | 태도 3축 | `AttitudeAxis` |
 * | 정서 안정 | `emotionalStability` |
 * | 공감 인정 | `empathyAcknowledgement` |
 * | 경계 설정 | `boundarySetting` |
 * | 진정 여부 | `calmed` |
 * | 소요 턴 수 | `turnsToCalm` |
 *
 * 필드 모양은 백엔드 `/api/training-sessions` 응답과 같다(슬라이스
 * jinsang-stop/jinsang-stop#4 · #5 · #6 · #7에서 확정).
 */

import type { Intensity } from "~/officialCard/types";

/** 세션 시작 요청 — 카드 식별자 + `강도`. */
export type TrainingSessionStartRequest = {
  cardId: number;
  intensity: Intensity;
};

/** 세션 상태. 진행 중이 아니면 그 값이 곧 종료 사유다. */
export type TrainingSessionStatus =
  | "IN_PROGRESS"
  /** 진정 종료 — `소요 턴 수`가 기록되는 유일한 사유. */
  | "CALMED"
  /** 진정시키지 못한 채 종료 — `하드 턴 상한` 도달. */
  | "TURN_LIMIT_REACHED"
  /** 사용자 중단. */
  | "ABORTED"
  /** 오래 방치돼 자동으로 정리됨. */
  | "ABANDONED"
  /** 시스템 오류로 중단. */
  | "SYSTEM_ERROR";

/** `훈련 세션` 정보. 카드의 진정 조건·양보 불가선은 담기지 않는다. */
export type TrainingSession = {
  sessionId: number;
  cardId: number;
  complainantRoleName: string;
  intensity: Intensity;
  hardTurnLimit: number;
  status: TrainingSessionStatus;
  /** 확정된 `발화 턴` 수(시작 직후 0). */
  turnCount: number;
  startedAt: string;
  /** 진정 종료(`CALMED`)일 때만 값이 있다. */
  turnsToCalm: number | null;
  /** 진행 중이면 `null`. */
  endedAt: string | null;
};

/** `태도 3축` — 고정된 세 축(ADR-0002). 늘리거나 줄이지 않는다. */
export type AttitudeAxis =
  | "emotionalStability"
  | "empathyAcknowledgement"
  | "boundarySetting";

export const ATTITUDE_AXES: readonly { axis: AttitudeAxis; label: string }[] = [
  { axis: "emotionalStability", label: "정서 안정" },
  { axis: "empathyAcknowledgement", label: "공감 인정" },
  { axis: "boundarySetting", label: "경계 설정" },
];

/** 점수 범위 — 축마다 1~5 정수. */
export const ATTITUDE_SCORE_MIN = 1;
export const ATTITUDE_SCORE_MAX = 5;

/** 한 축의 점수와 짧은 근거(80자 이내). */
export type AxisScore = {
  score: number;
  reason: string;
};

/**
 * 채점 상태.
 * - `PENDING`: 채점 중 — 점수 조회 API로 다시 받는다.
 * - `SCORED`: 세 축 모두 채점됨.
 * - `FAILED`: 채점 실패 — 세 축 모두 `정보 없음`. 0점이 아니다.
 */
export type TurnScoreStatus = "PENDING" | "SCORED" | "FAILED";

/**
 * 턴 점수. `PENDING` · `FAILED`면 세 축이 모두 `null`(`정보 없음`)이다.
 * 세 축을 합친 값은 두지 않는다(ADR-0004).
 */
export type TurnScore = {
  turnNumber: number;
  status: TurnScoreStatus;
} & Record<AttitudeAxis, AxisScore | null>;

/** 채점되지 않은 턴인가. */
export function isUnscored(score: TurnScore): boolean {
  return score.status === "FAILED";
}

/**
 * 확정된 `발화 턴` — 사용자 전사 + `민원인` 응답(대사 · 합성 음성 · 진정 여부)
 * + `태도 3축` 점수.
 */
export type UtteranceTurnResult = {
  sessionId: number;
  /** 1부터. 빈 전사는 번호를 소모하지 않는다. */
  turnNumber: number;
  /** 사용자 발화의 전사 텍스트. */
  userTranscript: string;
  /** `출력 검사`를 통과한 `민원인` 대사. */
  complainantLine: string;
  /** `민원인`이 이 턴에서 진정했는가. */
  calmed: boolean;
  /** `민원인` 대사의 합성 음성(Base64). 서버에 남지 않아 다시 받을 수 없다. */
  complainantAudio: string;
  /** 합성 음성 형식. 예: `audio/wav` */
  complainantAudioContentType: string;
  /** 이 턴의 점수. 채점이 늦으면 `PENDING`으로 온다. */
  score: TurnScore;
  /** 이 턴 처리 후 세션 상태 — `IN_PROGRESS`가 아니면 세션이 끝났다. */
  sessionStatus: TrainingSessionStatus;
  /** 이 턴으로 진정 종료됐을 때만 값이 있다. */
  turnsToCalm: number | null;
};

/**
 * 세션 화면이 분기하는 오류 코드.
 * 문구는 여기 두지 않는다. 백엔드가 내려준 메시지를 그대로 보여준다.
 */
export const TrainingSessionErrorCode = {
  /** 다른 `훈련 세션`이 진행 중이라 시작할 수 없다 — 내 세션일 수도 있다. */
  busy: "TRAINING_SESSION_BUSY",
  /** `음성 서비스`나 `추론 서비스`가 응답하지 않는다. 턴은 소모되지 않는다. */
  environmentNotReady: "TRAINING_ENVIRONMENT_NOT_READY",
  /** 전사가 비어 있다 — 턴 번호를 소모하지 않았다. */
  emptyTranscript: "EMPTY_TRANSCRIPT",
  /** 보낸 오디오를 읽지 못했다 — 턴 번호를 소모하지 않았다. */
  audioUnreadable: "AUDIO_UNREADABLE",
  /** `출력 검사` 재시도까지 실패해 세션이 "시스템 오류로 중단"으로 끝났다. */
  endedBySystemError: "SESSION_ENDED_BY_SYSTEM_ERROR",
} as const;
