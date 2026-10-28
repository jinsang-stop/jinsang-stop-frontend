import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "~/api/errors";
import type { Intensity } from "~/officialCard/types";
import {
  abortTrainingSession,
  fetchCurrentTrainingSession,
  fetchTurnScore,
  startTrainingSession,
  submitUtteranceTurn,
} from "./api";
import { TrainingSessionErrorCode } from "./types";
import type {
  TrainingSession,
  TrainingSessionStatus,
  TurnScore,
  UtteranceTurnResult,
} from "./types";

export type SessionPhase =
  | { kind: "starting" }
  | { kind: "startFailed"; error: unknown }
  /** 시작이 거절됐는데 진행 중인 세션이 내 것이다 — 이어 하거나 중단하고 새로 시작한다. */
  | { kind: "ownSessionInProgress"; session: TrainingSession }
  | { kind: "active"; session: TrainingSession }
  | { kind: "aborted"; error: unknown }
  /** 진정 종료 · 턴 상한 도달로 끝났다. 종료 화면은 #6에서 채운다. */
  | {
      kind: "ended";
      status: TrainingSessionStatus;
      turnsToCalm: number | null;
      sessionId: number;
    };

/** 진행 중인 세션에서 지금 하고 있는 일. */
export type SessionActivity = "ready" | "submitting" | "complainantSpeaking";

/** 말하기 조작 위에 띄우는 안내. 다음 턴을 시작하면 사라진다. */
export type SessionNotice =
  /** 빈 전사 · 오디오 해독 실패 — 턴을 소모하지 않았다. 다시 말하면 된다. */
  | { kind: "speakAgain"; error: ApiError }
  /** 음성·추론 서비스 문제 — 턴을 소모하지 않았다. 같은 녹음을 다시 보낼 수 있다. */
  | { kind: "environmentNotReady"; error: ApiError }
  | { kind: "submitFailed"; error: unknown };

export type CompletedTurn = Pick<
  UtteranceTurnResult,
  "turnNumber" | "userTranscript" | "complainantLine"
>;

const SCORE_POLL_INTERVAL_MS = 1000;
/** 이만큼 기다려도 점수가 `PENDING`이면 그 턴은 채점되지 않은 것으로 표시한다. */
const SCORE_WAIT_LIMIT_MS = 60_000;

/**
 * 세션 화면의 흐름 — 시작, 턴 제출, `민원인` 음성 재생, 점수 수신.
 *
 * 점수는 턴 응답에 실려 오지만 채점이 연기보다 늦게 끝나면 `PENDING`으로 온다.
 * 그때는 점수 조회 API로 끝날 때까지 다시 묻는다(슬라이스 #6 공통 계약).
 */
export function useTrainingSession(cardId: number, intensity: Intensity) {
  const [phase, setPhase] = useState<SessionPhase>({ kind: "starting" });
  const [activity, setActivity] = useState<SessionActivity>("ready");
  const [turns, setTurns] = useState<CompletedTurn[]>([]);
  /** 확정된 턴 수. 이어 하는 세션은 이전 턴 기록 없이 수만 이어받는다. */
  const [turnCount, setTurnCount] = useState(0);
  const [scores, setScores] = useState<Record<number, TurnScore>>({});
  const [speakingTurnNumber, setSpeakingTurnNumber] = useState<number | null>(
    null,
  );
  const [notice, setNotice] = useState<SessionNotice | null>(null);

  const startedRef = useRef(false);
  const unmountedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 환경 미준비로 거절된 녹음 — 턴이 소모되지 않아 그대로 다시 보낼 수 있다. */
  const unsentAudioRef = useRef<Blob | null>(null);

  const activate = useCallback((session: TrainingSession) => {
    setTurnCount(session.turnCount);
    setPhase({ kind: "active", session });
  }, []);

  const start = useCallback(async () => {
    setPhase({ kind: "starting" });
    try {
      activate(await startTrainingSession({ cardId, intensity }));
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === TrainingSessionErrorCode.busy
      ) {
        // 진행 중인 세션이 내 것이면(새로고침 등) 이어 하거나 중단할 수 있게 한다.
        const mine = await fetchCurrentTrainingSession().catch(() => null);
        if (mine) {
          setPhase({ kind: "ownSessionInProgress", session: mine });
          return;
        }
      }
      setPhase({ kind: "startFailed", error });
    }
  }, [activate, cardId, intensity]);

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

  /** 진행 중인 내 세션을 이어 한다. */
  const resume = useCallback(
    (session: TrainingSession) => activate(session),
    [activate],
  );

  /** 진행 중인 내 세션을 중단하고 지금 고른 카드·강도로 새로 시작한다. */
  const abortAndRestart = useCallback(
    async (session: TrainingSession) => {
      setPhase({ kind: "starting" });
      try {
        await abortTrainingSession(session.sessionId);
      } catch (error) {
        setPhase({ kind: "startFailed", error });
        return;
      }
      await start();
    },
    [start],
  );

  const playComplainantSpeech = useCallback(
    (result: UtteranceTurnResult, onFinished: () => void) => {
      const url = URL.createObjectURL(
        base64ToBlob(result.complainantAudio, result.complainantAudioContentType),
      );
      const audio = new Audio(url);
      audioRef.current = audio;

      const finish = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
          setSpeakingTurnNumber(null);
          setActivity("ready");
          onFinished();
        }
      };
      audio.onended = finish;
      audio.onerror = finish;

      setSpeakingTurnNumber(result.turnNumber);
      setActivity("complainantSpeaking");
      // 자동 재생이 막히면 대사 텍스트만 남기고 다음 턴으로 넘어간다.
      audio.play().catch(finish);
    },
    [],
  );

  const pollScore = useCallback(
    async (sessionId: number, turnNumber: number) => {
      const deadline = Date.now() + SCORE_WAIT_LIMIT_MS;
      while (!unmountedRef.current && Date.now() < deadline) {
        await wait(SCORE_POLL_INTERVAL_MS);
        try {
          const score = await fetchTurnScore(sessionId, turnNumber);
          if (score.status !== "PENDING") {
            setScores((prev) => ({ ...prev, [turnNumber]: score }));
            return;
          }
        } catch {
          // 일시적인 실패는 다음 시도에서 다시 묻는다.
        }
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
      const { sessionId } = phase.session;
      setNotice(null);
      setActivity("submitting");
      unsentAudioRef.current = null;
      let result: UtteranceTurnResult;
      try {
        result = await submitUtteranceTurn(sessionId, audio);
      } catch (error) {
        if (unmountedRef.current) {
          return;
        }
        setActivity("ready");
        if (error instanceof ApiError) {
          switch (error.code) {
            case TrainingSessionErrorCode.emptyTranscript:
            case TrainingSessionErrorCode.audioUnreadable:
              setNotice({ kind: "speakAgain", error });
              return;
            case TrainingSessionErrorCode.environmentNotReady:
              unsentAudioRef.current = audio;
              setNotice({ kind: "environmentNotReady", error });
              return;
            case TrainingSessionErrorCode.endedBySystemError:
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
          userTranscript: result.userTranscript,
          complainantLine: result.complainantLine,
        },
      ]);
      setTurnCount(result.turnNumber);
      if (result.score.status === "PENDING") {
        void pollScore(sessionId, result.turnNumber);
      } else {
        setScores((prev) => ({ ...prev, [result.turnNumber]: result.score }));
      }
      // 세션이 끝난 턴이면 `민원인`의 마지막 말을 다 들려준 뒤 종료로 넘어간다.
      playComplainantSpeech(result, () => {
        if (result.sessionStatus !== "IN_PROGRESS") {
          setPhase({
            kind: "ended",
            status: result.sessionStatus,
            turnsToCalm: result.turnsToCalm,
            sessionId,
          });
        }
      });
    },
    [phase, playComplainantSpeech, pollScore],
  );

  /** 환경 미준비로 거절된 녹음을 그대로 다시 보낸다. */
  const resendUnsentTurn = useCallback(async () => {
    const audio = unsentAudioRef.current;
    if (audio) {
      await submitTurn(audio);
    }
  }, [submitTurn]);

  const clearNotice = useCallback(() => {
    unsentAudioRef.current = null;
    setNotice(null);
  }, []);

  return {
    phase,
    activity,
    turns,
    turnCount,
    scores,
    speakingTurnNumber,
    notice,
    retryStart: start,
    resume,
    abortAndRestart,
    submitTurn,
    resendUnsentTurn,
    clearNotice,
  };
}

/**
 * 기다려도 점수가 오지 않은 턴을 화면에서 "채점되지 않음"으로 두기 위한 값.
 * 0점으로 채우지 않는다 — 세 축 모두 `정보 없음`이다.
 */
function unscoredTurn(turnNumber: number): TurnScore {
  return {
    turnNumber,
    status: "FAILED",
    emotionalStability: null,
    empathyAcknowledgement: null,
    boundarySetting: null,
  };
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
