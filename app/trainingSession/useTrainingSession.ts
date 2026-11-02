import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "~/api/errors";
import type { Intensity } from "~/officialCard/types";
import {
  fetchTurnScore,
  startTrainingSession,
  submitUtteranceTurn,
} from "./api";
import { TrainingSessionErrorCode } from "./types";
import type { TurnScore, UtteranceTurnResult } from "./types";

export type SessionPhase =
  | { kind: "starting" }
  | { kind: "startFailed"; error: unknown }
  | { kind: "active"; sessionId: string }
  | { kind: "aborted"; error: unknown };

/** 진행 중인 세션에서 지금 하고 있는 일. */
export type SessionActivity = "ready" | "submitting" | "complainantSpeaking";

/** 말하기 조작 위에 띄우는 안내. 다음 턴을 시작하면 사라진다. */
export type SessionNotice =
  | { kind: "emptyTranscript"; error: ApiError }
  | { kind: "submitFailed"; error: unknown };

export type CompletedTurn = Pick<
  UtteranceTurnResult,
  "turnNumber" | "transcript" | "complainantLine"
>;

const SCORE_POLL_INTERVAL_MS = 1000;
/** 이만큼 기다려도 점수가 없으면 그 턴은 채점되지 않은 것으로 표시한다. */
const SCORE_WAIT_LIMIT_MS = 60_000;

/**
 * 세션 화면의 흐름 — 시작, 턴 제출, `민원인` 음성 재생, 점수 수신.
 *
 * 점수는 턴 응답과 따로 받는다. 채점이 연기보다 늦게 끝날 수 있어서 턴 응답이
 * 오면 그 턴의 점수를 도착할 때까지 따로 묻는다(슬라이스 #6 공통 계약).
 */
export function useTrainingSession(cardId: string, intensity: Intensity) {
  const [phase, setPhase] = useState<SessionPhase>({ kind: "starting" });
  const [activity, setActivity] = useState<SessionActivity>("ready");
  const [turns, setTurns] = useState<CompletedTurn[]>([]);
  const [scores, setScores] = useState<Record<number, TurnScore>>({});
  const [speakingTurnNumber, setSpeakingTurnNumber] = useState<number | null>(
    null,
  );
  const [notice, setNotice] = useState<SessionNotice | null>(null);

  const startedRef = useRef(false);
  const unmountedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const start = useCallback(async () => {
    setPhase({ kind: "starting" });
    try {
      const { sessionId } = await startTrainingSession({ cardId, intensity });
      setPhase({ kind: "active", sessionId });
    } catch (error) {
      setPhase({ kind: "startFailed", error });
    }
  }, [cardId, intensity]);

  useEffect(() => {
    // 개발 모드의 StrictMode가 이펙트를 두 번 돌려도 세션은 한 번만 시작한다.
    if (!startedRef.current) {
      startedRef.current = true;
      void start();
    }
  }, [start]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      audioRef.current?.pause();
    };
  }, []);

  const playComplainantSpeech = useCallback((result: UtteranceTurnResult) => {
    const url = URL.createObjectURL(
      base64ToBlob(result.complainantAudio, result.complainantAudioMimeType),
    );
    const audio = new Audio(url);
    audioRef.current = audio;

    const finish = () => {
      URL.revokeObjectURL(url);
      if (audioRef.current === audio) {
        audioRef.current = null;
        setSpeakingTurnNumber(null);
        setActivity("ready");
      }
    };
    audio.onended = finish;
    audio.onerror = finish;

    setSpeakingTurnNumber(result.turnNumber);
    setActivity("complainantSpeaking");
    // 자동 재생이 막히면 대사 텍스트만 남기고 다음 턴으로 넘어간다.
    audio.play().catch(finish);
  }, []);

  const pollScore = useCallback(
    async (sessionId: string, turnNumber: number) => {
      const deadline = Date.now() + SCORE_WAIT_LIMIT_MS;
      while (!unmountedRef.current && Date.now() < deadline) {
        try {
          const score = await fetchTurnScore(sessionId, turnNumber);
          if (score) {
            setScores((prev) => ({ ...prev, [turnNumber]: score }));
            return;
          }
        } catch {
          // 일시적인 실패는 다음 시도에서 다시 묻는다.
        }
        await wait(SCORE_POLL_INTERVAL_MS);
      }
      if (!unmountedRef.current) {
        setScores((prev) => ({ ...prev, [turnNumber]: unscoredTurn(turnNumber) }));
      }
    },
    [],
  );

  const submitTurn = useCallback(
    async (audio: Blob) => {
      if (phase.kind !== "active") {
        return;
      }
      setNotice(null);
      setActivity("submitting");
      let result: UtteranceTurnResult;
      try {
        result = await submitUtteranceTurn(phase.sessionId, audio);
      } catch (error) {
        if (unmountedRef.current) {
          return;
        }
        setActivity("ready");
        if (error instanceof ApiError) {
          if (error.code === TrainingSessionErrorCode.emptyTranscript) {
            setNotice({ kind: "emptyTranscript", error });
            return;
          }
          if (error.code === TrainingSessionErrorCode.abortedBySystemError) {
            setPhase({ kind: "aborted", error });
            return;
          }
        }
        setNotice({ kind: "submitFailed", error });
        return;
      }
      if (unmountedRef.current) {
        return;
      }
      setTurns((prev) => [
        ...prev,
        {
          turnNumber: result.turnNumber,
          transcript: result.transcript,
          complainantLine: result.complainantLine,
        },
      ]);
      playComplainantSpeech(result);
      void pollScore(phase.sessionId, result.turnNumber);
    },
    [phase, playComplainantSpeech, pollScore],
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  return {
    phase,
    activity,
    turns,
    scores,
    speakingTurnNumber,
    notice,
    retryStart: start,
    submitTurn,
    clearNotice,
  };
}

/**
 * 기다려도 점수가 오지 않은 턴을 화면에서 "채점되지 않음"으로 두기 위한 값.
 * 0점으로 채우지 않는다 — 세 축 모두 `정보 없음`이다.
 */
function unscoredTurn(turnNumber: number): TurnScore {
  const none = { score: null, rationale: null };
  return {
    turnNumber,
    axes: {
      emotionalStability: none,
      empathyAcknowledgement: none,
      boundarySetting: none,
    },
  };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
