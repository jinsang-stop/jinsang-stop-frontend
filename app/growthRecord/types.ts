/**
 * `성장 기록` 관련 타입.
 *
 * 필드 모양은 백엔드 `GET /api/growth-records?cardId=&intensity=`(슬라이스
 * jinsang-stop/jinsang-stop#9)와 같다. 한 응답은 한 카드·한 `강도`의 시계열이다 —
 * 강도가 다른 세션은 섞이지 않는다(ADR-0004).
 */

import type { Intensity } from "~/officialCard/types";

/** 그래프의 점 하나 = 성장 기록에 편입된 세션 하나. */
export type GrowthPoint = {
  /** 점을 누르면 그 세션의 리포트로 간다. */
  sessionId: number;
  /** x축 — 세션 종료 시각. */
  endedAt: string;
  /** y축(주지표) — `소요 턴 수`. 작을수록 빨리 진정시켰다. */
  turnsToCalm: number;
  /** 보조 지표 — 세션의 축별 평균. 합산하지 않는다. */
  emotionalStability: number;
  empathyAcknowledgement: number;
  boundarySetting: number;
};

export type GrowthRecord = {
  cardId: number;
  cardName: string;
  intensity: Intensity;
  /** `false`면 경계 설정 하한선이 아직 없어 모든 세션이 편입 보류다 — 점이 없는 이유를 안내한다. */
  boundaryThresholdConfigured: boolean;
  /** 종료 시각 오름차순. */
  points: GrowthPoint[];
};
