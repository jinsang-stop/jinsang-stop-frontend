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
 * | 진정 여부 | `calmedDown` |
 *
 * 필드 모양은 슬라이스 jinsang-stop/jinsang-stop#4 · #5 · #6의 「공통 계약」을
 * 따른다. 계약이 아직 정하지 않은 부분(오류 코드 이름, 음성 전달 형식, 점수
 * 범위와 전달 방식)은 여기서 가정했다 — #3 · #4 · #5에서 백엔드와 맞추며 고친다.
 */

import type { Intensity } from "~/officialCard/types";

/** 세션 시작 요청 — 카드 식별자 + `강도`. */
export type TrainingSessionStartRequest = {
  cardId: string;
  intensity: Intensity;
};

/** 세션 시작 응답 — 세션 식별자. */
export type TrainingSessionStarted = {
  sessionId: string;
};

/**
 * `발화 턴` 제출 응답.
 * #4 계약(턴 번호 + 전사)에 #5 계약(`민원인` 대사 · 합성 음성 · 진정 여부)을 더한 모양이다.
 */
export type UtteranceTurnResult = {
  turnNumber: number;
  /** 사용자 발화의 전사 텍스트. */
  transcript: string;
  /** `출력 검사`를 통과한 `민원인` 대사. */
  complainantLine: string;
  /** `민원인` 대사의 합성 음성 — base64로 인코딩한 오디오. (가정) */
  complainantAudio: string;
  /** 합성 음성의 MIME 타입. 예: `audio/wav` (가정) */
  complainantAudioMimeType: string;
  /** `민원인`이 진정했는가. 종료 판정은 #6에서 쓴다. */
  calmedDown: boolean;
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

/** 점수 범위. 슬라이스 #6에서 확정되면 이 값만 바꾼다. (가정) */
export const ATTITUDE_SCORE_MIN = 0;
export const ATTITUDE_SCORE_MAX = 100;

/**
 * 한 축의 점수. 채점에 실패하면 `score`와 `rationale` 모두 `null` — `정보 없음`이다.
 * `null`을 0으로 바꿔 쓰지 않는다.
 */
export type AxisScore = {
  score: number | null;
  /** 짧은 근거. */
  rationale: string | null;
};

/** 턴 점수 — 턴 번호 + 축별 점수·근거. 세 축을 합친 값은 두지 않는다. */
export type TurnScore = {
  turnNumber: number;
  axes: Record<AttitudeAxis, AxisScore>;
};

/** 채점되지 않은 턴인가 — 채점 실패는 세 축 모두 `정보 없음`이다. */
export function isUnscored(score: TurnScore): boolean {
  return ATTITUDE_AXES.every(({ axis }) => score.axes[axis].score === null);
}

/**
 * 세션 화면이 분기하는 오류 코드. (가정 — #3 · #4에서 백엔드와 맞춘다)
 * 문구는 여기 두지 않는다. 백엔드가 내려준 메시지를 그대로 보여준다.
 */
export const TrainingSessionErrorCode = {
  /** 다른 `훈련 세션`이 진행 중이라 시작할 수 없다. */
  sessionInProgress: "TRAINING_SESSION_IN_PROGRESS",
  /** `음성 서비스`나 `추론 서비스`가 응답하지 않는다. */
  environmentNotReady: "TRAINING_ENVIRONMENT_NOT_READY",
  /** 전사가 비어 있다 — 턴 번호를 소모하지 않았다. */
  emptyTranscript: "EMPTY_TRANSCRIPT",
  /** `출력 검사` 재시도까지 실패해 세션이 "시스템 오류로 중단"으로 끝났다. */
  abortedBySystemError: "TRAINING_SESSION_ABORTED_BY_SYSTEM_ERROR",
} as const;
