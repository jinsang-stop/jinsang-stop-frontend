import { apiFetch } from "~/api/client";
import {
  mockFetchTurnScore,
  mockStartTrainingSession,
  mockSubmitUtteranceTurn,
} from "./mock";
import type {
  TrainingSessionStartRequest,
  TrainingSessionStarted,
  TurnScore,
  UtteranceTurnResult,
} from "./types";

/** 백엔드 대신 임시 응답을 쓸지. 백엔드 API가 열리면 이 플래그와 mock을 함께 지운다. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/*
 * 경로는 가정이다 — #3 · #4 · #5에서 백엔드와 맞추며 고친다.
 * 오디오는 Spring으로만 보낸다. `음성 서비스`를 브라우저에서 부르지 않는다.
 */

/** `훈련 세션` 시작. 진행 중인 세션이 있거나 환경이 준비되지 않았으면 거절된다. */
export async function startTrainingSession(
  request: TrainingSessionStartRequest,
): Promise<TrainingSessionStarted> {
  if (USE_MOCK) {
    return mockStartTrainingSession(request);
  }
  return apiFetch<TrainingSessionStarted>("/api/training-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

/** `발화 턴` 제출 — 녹음한 오디오를 보내고 전사와 `민원인` 응답을 받는다. */
export async function submitUtteranceTurn(
  sessionId: string,
  audio: Blob,
): Promise<UtteranceTurnResult> {
  if (USE_MOCK) {
    return mockSubmitUtteranceTurn(sessionId, audio);
  }
  const body = new FormData();
  body.append("audio", audio);
  return apiFetch<UtteranceTurnResult>(
    `/api/training-sessions/${encodeURIComponent(sessionId)}/turns`,
    { method: "POST", body },
  );
}

/**
 * 턴 점수. 채점은 턴 응답보다 늦게 끝날 수 있어 아직이면 `null`이다(204).
 * 채점에 실패한 턴은 `null`이 아니라 세 축이 모두 `정보 없음`인 점수로 온다.
 */
export async function fetchTurnScore(
  sessionId: string,
  turnNumber: number,
): Promise<TurnScore | null> {
  if (USE_MOCK) {
    return mockFetchTurnScore(sessionId, turnNumber);
  }
  const score = await apiFetch<TurnScore | undefined>(
    `/api/training-sessions/${encodeURIComponent(sessionId)}/turns/${turnNumber}/score`,
  );
  return score ?? null;
}
