import { apiFetch } from "~/api/client";
import {
  mockAbortTrainingSession,
  mockFetchCurrentTrainingSession,
  mockFetchTurnScore,
  mockStartTrainingSession,
  mockSubmitUtteranceTurn,
} from "./mock";
import type {
  TrainingSession,
  TrainingSessionStartRequest,
  TurnScore,
  UtteranceTurnResult,
} from "./types";

/** 백엔드 대신 임시 응답을 쓸지. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/*
 * 오디오는 Spring으로만 보낸다. `음성 서비스`를 브라우저에서 부르지 않는다.
 */

/** `훈련 세션` 시작. 진행 중인 세션이 있거나 환경이 준비되지 않았으면 거절된다. */
export async function startTrainingSession(
  request: TrainingSessionStartRequest,
): Promise<TrainingSession> {
  if (USE_MOCK) {
    return mockStartTrainingSession(request);
  }
  return apiFetch<TrainingSession>("/api/training-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

/**
 * 내 진행 중 세션. 없으면 `null`(204).
 * 시작이 `TRAINING_SESSION_BUSY`로 거절됐을 때 내 세션인지 남의 세션인지 가린다.
 */
export async function fetchCurrentTrainingSession(): Promise<TrainingSession | null> {
  if (USE_MOCK) {
    return mockFetchCurrentTrainingSession();
  }
  const session = await apiFetch<TrainingSession | undefined>(
    "/api/training-sessions/current",
  );
  return session ?? null;
}

/** 진행 중인 세션을 중단한다. */
export async function abortTrainingSession(
  sessionId: number,
): Promise<TrainingSession> {
  if (USE_MOCK) {
    return mockAbortTrainingSession(sessionId);
  }
  return apiFetch<TrainingSession>(
    `/api/training-sessions/${sessionId}/abort`,
    { method: "POST" },
  );
}

/**
 * `발화 턴` 제출 — 녹음한 오디오를 본문에 그대로 싣고 전사와 `민원인` 응답을 받는다.
 * multipart가 아니다. `Content-Type`은 녹음 형식(`audio/webm` 등) 그대로다.
 */
export async function submitUtteranceTurn(
  sessionId: number,
  audio: Blob,
): Promise<UtteranceTurnResult> {
  if (USE_MOCK) {
    return mockSubmitUtteranceTurn(sessionId, audio);
  }
  return apiFetch<UtteranceTurnResult>(
    `/api/training-sessions/${sessionId}/turns`,
    {
      method: "POST",
      headers: { "Content-Type": audio.type || "audio/webm" },
      body: audio,
    },
  );
}

/** 턴 점수 다시 받기 — 턴 응답의 점수가 `PENDING`이었을 때 쓴다. */
export async function fetchTurnScore(
  sessionId: number,
  turnNumber: number,
): Promise<TurnScore> {
  if (USE_MOCK) {
    return mockFetchTurnScore(sessionId, turnNumber);
  }
  return apiFetch<TurnScore>(
    `/api/training-sessions/${sessionId}/turns/${turnNumber}/score`,
  );
}
