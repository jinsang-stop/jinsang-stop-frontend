import { apiFetch } from "~/api/client";
import { mockFetchSessionReport } from "./mock";
import type { SessionReport } from "./types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/** 끝난 세션의 리포트. 진행 중이면 `TRAINING_SESSION_IN_PROGRESS`(409)로 거절된다. */
export async function fetchSessionReport(
  sessionId: string | number,
): Promise<SessionReport> {
  if (USE_MOCK) {
    return mockFetchSessionReport(Number(sessionId));
  }
  return apiFetch<SessionReport>(
    `/api/training-sessions/${encodeURIComponent(String(sessionId))}/report`,
  );
}
