import type { Page, Route } from "@playwright/test";

import {
  CARDS,
  INTENSITY_GUIDE,
  TURNS,
  USER,
  silentWavBase64,
} from "./storedResponses";

const API = "http://localhost:8080";
const AXES = ["emotionalStability", "empathyAcknowledgement", "boundarySetting"] as const;

type FakeSession = {
  sessionId: number;
  cardId: number;
  intensity: number;
  status: string;
  turnCount: number;
  startedAt: string;
  endedAt: string | null;
  turnsToCalm: number | null;
};

/**
 * 저장 응답으로 도는 가짜 Spring 백엔드. 브라우저의 `localhost:8080/api/**` 요청을
 * 가로채 응답한다. 세션·턴 상태를 기억해 리포트와 성장 기록까지 이어지게 한다.
 *
 * 턴 제출은 실제 계약대로 검사한다 — 본문이 비어 있지 않은 오디오이고
 * `Content-Type`이 `audio/*`여야 한다(multipart면 415).
 */
export async function installFakeBackend(page: Page) {
  const state = {
    loggedIn: false,
    sessions: [] as FakeSession[],
    submittedContentTypes: [] as string[],
  };
  const origin = "http://localhost:5175";

  const json = (route: Route, status: number, body?: unknown) =>
    route.fulfill({
      status,
      headers: cors(origin),
      contentType: "application/json",
      body: body === undefined ? "" : JSON.stringify(body),
    });
  const error = (route: Route, status: number, code: string, message: string) =>
    json(route, status, { status, code, message });

  await page.route(`${API}/api/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors(origin) });
    }
    if (path === "/api/auth/login" && method === "POST") {
      state.loggedIn = true;
      return json(route, 200, USER);
    }
    if (path === "/api/auth/logout") {
      state.loggedIn = false;
      return json(route, 204);
    }
    if (!state.loggedIn) {
      return error(route, 401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }
    if (path === "/api/auth/me") {
      return json(route, 200, USER);
    }
    if (path === "/api/cards") {
      return json(route, 200, CARDS);
    }
    const cardMatch = path.match(/^\/api\/cards\/(\d+)$/);
    if (cardMatch) {
      const card = CARDS.find((it) => it.cardId === Number(cardMatch[1]));
      return card
        ? json(route, 200, card)
        : error(route, 404, "CARD_NOT_FOUND", "시나리오 카드를 찾을 수 없습니다.");
    }
    if (path === "/api/intensities") {
      return json(route, 200, INTENSITY_GUIDE);
    }
    if (path === "/api/training-sessions" && method === "POST") {
      if (state.sessions.some((it) => it.status === "IN_PROGRESS")) {
        return error(route, 409, "TRAINING_SESSION_BUSY", "다른 훈련이 진행 중입니다.");
      }
      const { cardId, intensity } = request.postDataJSON();
      const session: FakeSession = {
        sessionId: state.sessions.length + 1,
        cardId,
        intensity,
        status: "IN_PROGRESS",
        turnCount: 0,
        startedAt: timestamp(state.sessions.length * 10),
        endedAt: null,
        turnsToCalm: null,
      };
      state.sessions.push(session);
      return json(route, 201, sessionResponse(session));
    }
    if (path === "/api/training-sessions/current") {
      const current = state.sessions.find((it) => it.status === "IN_PROGRESS");
      return current ? json(route, 200, sessionResponse(current)) : json(route, 204);
    }
    const turnMatch = path.match(/^\/api\/training-sessions\/(\d+)\/turns$/);
    if (turnMatch && method === "POST") {
      const session = state.sessions[Number(turnMatch[1]) - 1];
      const contentType = request.headers()["content-type"] ?? "";
      state.submittedContentTypes.push(contentType);
      if (!contentType.startsWith("audio/")) {
        return error(route, 415, "UNSUPPORTED_MEDIA_TYPE", "지원하지 않는 요청 형식입니다.");
      }
      if (!request.postDataBuffer()?.length) {
        return error(route, 422, "AUDIO_UNREADABLE", "녹음을 읽지 못했어요. 다시 말해 주세요.");
      }
      const turnNumber = session.turnCount + 1;
      const stored = TURNS[(turnNumber - 1) % TURNS.length];
      session.turnCount = turnNumber;
      if (stored.calmed) {
        session.status = "CALMED";
        session.turnsToCalm = turnNumber;
        session.endedAt = timestamp(state.sessions.length * 10 + 5);
      }
      return json(route, 201, {
        sessionId: session.sessionId,
        turnNumber,
        userTranscript: stored.userTranscript,
        complainantLine: stored.complainantLine,
        calmed: stored.calmed,
        complainantAudio: silentWavBase64(),
        complainantAudioContentType: "audio/wav",
        score: scoreResponse(turnNumber),
        sessionStatus: session.status,
        turnsToCalm: session.turnsToCalm,
      });
    }
    const reportMatch = path.match(/^\/api\/training-sessions\/(\d+)\/report$/);
    if (reportMatch) {
      const session = state.sessions[Number(reportMatch[1]) - 1];
      return json(route, 200, reportResponse(session));
    }
    if (path === "/api/growth-records") {
      const cardId = Number(url.searchParams.get("cardId"));
      const intensity = Number(url.searchParams.get("intensity"));
      const card = CARDS.find((it) => it.cardId === cardId)!;
      const points = state.sessions
        .filter(
          (it) =>
            it.cardId === cardId && it.intensity === intensity && it.status === "CALMED",
        )
        .map((it) => ({
          sessionId: it.sessionId,
          endedAt: it.endedAt,
          turnsToCalm: it.turnsToCalm,
          ...averages(it.turnCount),
        }));
      return json(route, 200, {
        cardId,
        cardName: card.name,
        intensity,
        boundaryThresholdConfigured: true,
        points,
      });
    }
    return error(route, 404, "NOT_FOUND", `저장 응답 없음: ${method} ${path}`);
  });

  return state;
}

function cors(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function sessionResponse(session: FakeSession) {
  const card = CARDS.find((it) => it.cardId === session.cardId)!;
  return {
    ...session,
    complainantRoleName: card.complainantRoleName,
    hardTurnLimit: card.hardTurnLimit,
  };
}

function scoreResponse(turnNumber: number) {
  const stored = TURNS[(turnNumber - 1) % TURNS.length];
  return {
    turnNumber,
    status: "SCORED",
    ...Object.fromEntries(
      AXES.map((axis, index) => [
        axis,
        { score: stored.scores[index][0], reason: stored.scores[index][1] },
      ]),
    ),
  };
}

function averages(turnCount: number) {
  return Object.fromEntries(
    AXES.map((axis, index) => {
      let sum = 0;
      for (let turn = 0; turn < turnCount; turn++) {
        sum += TURNS[turn % TURNS.length].scores[index][0];
      }
      return [axis, Math.round((sum / turnCount) * 100) / 100];
    }),
  ) as Record<(typeof AXES)[number], number>;
}

function reportResponse(session: FakeSession) {
  const card = CARDS.find((it) => it.cardId === session.cardId)!;
  const included = session.status === "CALMED";
  return {
    sessionId: session.sessionId,
    cardId: session.cardId,
    cardName: card.name,
    complainantRoleName: card.complainantRoleName,
    intensity: session.intensity,
    endReason: session.status,
    turnsToCalm: session.turnsToCalm,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    turns: Array.from({ length: session.turnCount }, (_, index) => {
      const stored = TURNS[index % TURNS.length];
      return {
        turnNumber: index + 1,
        userTranscript: stored.userTranscript,
        complainantLine: stored.complainantLine,
        calmed: stored.calmed,
        score: scoreResponse(index + 1),
      };
    }),
    axisAverages: averages(session.turnCount),
    growthRecord: {
      included,
      reasons: included
        ? []
        : [
            {
              code: "NOT_CALMED",
              message: "진정 종료로 끝나지 않은 훈련은 성장 기록에 들어가지 않아요.",
            },
          ],
    },
  };
}

/** 2026-10-28 14:00 기준 n분 뒤 — 점의 x축 순서를 고정한다. */
function timestamp(minutes: number): string {
  const date = new Date(Date.UTC(2026, 9, 28, 5, minutes));
  return date.toISOString().slice(0, 19);
}
