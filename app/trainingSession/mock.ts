import { ApiError } from "~/api/errors";
import { TrainingSessionErrorCode } from "./types";
import type {
  AttitudeAxis,
  TrainingSessionStartRequest,
  TrainingSessionStarted,
  TurnScore,
  UtteranceTurnResult,
} from "./types";

/**
 * 백엔드 세션·턴·점수 API(jinsang-stop-backend#3 · #4 · #5)가 아직 없어서 세션
 * 화면을 먼저 세우기 위한 임시 구현. `VITE_USE_MOCK_API=true`일 때만 쓰인다.
 *
 * 세션 화면 주소에 `?mock=<시나리오>`를 붙이면 상태별 화면을 재현할 수 있다.
 * | 값 | 재현하는 것 |
 * |---|---|
 * | `busy` | 다른 사람이 훈련 중이라 시작 거절 |
 * | `not-ready` | 훈련 환경 미준비로 시작 거절 |
 * | `empty` | 2턴 첫 제출이 빈 전사 — 턴 번호가 늘지 않는다 |
 * | `unscored` | 2턴이 채점되지 않음 |
 * | `abort` | 2턴에서 "시스템 오류로 중단" |
 *
 * 백엔드 API가 열리면 이 파일을 지운다.
 */
type MockScenario = "busy" | "not-ready" | "empty" | "unscored" | "abort";

type MockSession = {
  scenario: MockScenario | null;
  turnCount: number;
  emptyTranscriptShown: boolean;
  /** 턴 번호 → 점수가 "도착"하는 시각. 점수가 턴 응답보다 늦게 오는 것을 흉내 낸다. */
  scoreReadyAt: Map<number, number>;
};

const sessions = new Map<string, MockSession>();

const SUBMIT_DELAY_MS = 1500;
const SCORE_DELAY_MS = 1800;

export async function mockStartTrainingSession(
  _request: TrainingSessionStartRequest,
): Promise<TrainingSessionStarted> {
  await wait(700);
  const scenario = readScenario();
  if (scenario === "busy") {
    throw new ApiError(
      409,
      TrainingSessionErrorCode.sessionInProgress,
      "지금 다른 사람이 훈련 중입니다. 그 훈련이 끝나면 시작할 수 있습니다.",
    );
  }
  if (scenario === "not-ready") {
    throw new ApiError(
      503,
      TrainingSessionErrorCode.environmentNotReady,
      "훈련 환경이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  const sessionId = `mock-${Date.now()}`;
  sessions.set(sessionId, {
    scenario,
    turnCount: 0,
    emptyTranscriptShown: false,
    scoreReadyAt: new Map(),
  });
  return { sessionId };
}

export async function mockSubmitUtteranceTurn(
  sessionId: string,
  _audio: Blob,
): Promise<UtteranceTurnResult> {
  await wait(SUBMIT_DELAY_MS);
  const session = findSession(sessionId);
  const turnNumber = session.turnCount + 1;

  if (
    session.scenario === "empty" &&
    turnNumber === 2 &&
    !session.emptyTranscriptShown
  ) {
    session.emptyTranscriptShown = true;
    throw new ApiError(
      422,
      TrainingSessionErrorCode.emptyTranscript,
      "말씀을 알아듣지 못했습니다. 다시 말해 주세요.",
    );
  }
  if (session.scenario === "abort" && turnNumber === 2) {
    sessions.delete(sessionId);
    throw new ApiError(
      500,
      TrainingSessionErrorCode.abortedBySystemError,
      "시스템 오류로 훈련을 중단했습니다.",
    );
  }

  session.turnCount = turnNumber;
  session.scoreReadyAt.set(turnNumber, Date.now() + SCORE_DELAY_MS);

  const line = MOCK_COMPLAINANT_LINES[(turnNumber - 1) % MOCK_COMPLAINANT_LINES.length];
  return {
    turnNumber,
    transcript: MOCK_TRANSCRIPTS[(turnNumber - 1) % MOCK_TRANSCRIPTS.length],
    complainantLine: line,
    complainantAudio: silentWavBase64(Math.min(1500 + line.length * 80, 6000)),
    complainantAudioMimeType: "audio/wav",
    calmedDown: false,
  };
}

export async function mockFetchTurnScore(
  sessionId: string,
  turnNumber: number,
): Promise<TurnScore | null> {
  await wait(150);
  const session = findSession(sessionId);
  const readyAt = session.scoreReadyAt.get(turnNumber);
  if (readyAt === undefined || Date.now() < readyAt) {
    return null;
  }
  if (session.scenario === "unscored" && turnNumber === 2) {
    return {
      turnNumber,
      axes: {
        emotionalStability: { score: null, rationale: null },
        empathyAcknowledgement: { score: null, rationale: null },
        boundarySetting: { score: null, rationale: null },
      },
    };
  }
  return { turnNumber, axes: mockAxes(turnNumber) };
}

function mockAxes(turnNumber: number): TurnScore["axes"] {
  const at = (axis: AttitudeAxis, base: number, step: number) => {
    const score = Math.max(0, Math.min(100, base + step * turnNumber));
    return { score, rationale: MOCK_RATIONALES[axis][(turnNumber - 1) % 2] };
  };
  return {
    emotionalStability: at("emotionalStability", 58, 6),
    empathyAcknowledgement: at("empathyAcknowledgement", 35, 11),
    boundarySetting: at("boundarySetting", 70, -4),
  };
}

function findSession(sessionId: string): MockSession {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new ApiError(404, "TRAINING_SESSION_NOT_FOUND", "세션을 찾을 수 없습니다.");
  }
  return session;
}

function readScenario(): MockScenario | null {
  const value = new URLSearchParams(window.location.search).get("mock");
  const known: MockScenario[] = ["busy", "not-ready", "empty", "unscored", "abort"];
  return known.find((it) => it === value) ?? null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 재생 경로를 실제로 타도록 무음 WAV(8kHz · 8bit · 모노)를 만든다. */
function silentWavBase64(durationMs: number): string {
  const sampleRate = 8000;
  const samples = Math.round((sampleRate * durationMs) / 1000);
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) =>
    [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));

  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 모노
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8bit PCM의 무음은 128이다.

  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

const MOCK_TRANSCRIPTS = [
  "죄송합니다 손님, 어떤 부분이 불편하셨는지 말씀해 주시겠어요?",
  "기다리시게 해서 정말 불편하셨을 것 같아요. 다만 구매하신 지 두 달이 지나서 환불은 어렵습니다.",
  "대신 교환이나 수선이 가능한지 확인해 드릴 수 있어요.",
  "책임자분께 전달은 해 드리겠지만, 환불 기준은 동일하게 적용됩니다.",
];

const MOCK_COMPLAINANT_LINES = [
  "아니, 산 지 얼마나 됐다고 이게 벌써 망가져요? 당장 환불해 줘요.",
  "두 달이 뭐가 길어요? 다른 매장은 다 해 주던데 여기만 왜 이래요!",
  "교환은 필요 없다니까요. 내 말을 듣긴 하는 거예요?",
  "……알겠어요. 그럼 교환 쪽으로 한번 알아봐 줘요.",
];

const MOCK_RATIONALES: Record<AttitudeAxis, [string, string]> = {
  emotionalStability: [
    "언성이 높아진 뒤에도 같은 속도와 어조를 유지했습니다.",
    "비교하는 말에 반박하지 않고 차분히 이어 갔습니다.",
  ],
  empathyAcknowledgement: [
    "요구를 판단하기 전에 불편했던 점을 먼저 물었습니다.",
    "기다린 데 대한 감정을 말로 받아 주었습니다.",
  ],
  boundarySetting: [
    "환불이 어렵다는 점을 돌려 말하지 않고 전했습니다.",
    "기준을 되풀이했지만 대안 제시가 늦었습니다.",
  ],
};
