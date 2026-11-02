import { ApiError } from "~/api/errors";
import { MOCK_OFFICIAL_CARDS } from "~/officialCard/mock";
import type { Intensity } from "~/officialCard/types";
import { TrainingSessionErrorCode } from "./types";
import type {
  AttitudeAxis,
  AxisScore,
  TrainingSession,
  TrainingSessionStartRequest,
  TurnScore,
  UtteranceTurnResult,
} from "./types";

/**
 * 백엔드 없이 세션 화면을 보기 위한 임시 구현. `VITE_USE_MOCK_API=true`일 때만
 * 쓰인다. 응답 모양과 오류 코드는 백엔드 `/api/training-sessions`와 같게 둔다.
 *
 * 세션 화면 주소에 `&mock=<시나리오>`를 붙이면 상태별 화면을 재현할 수 있다.
 * | 값 | 재현하는 것 |
 * |---|---|
 * | `busy` | 다른 사람이 훈련 중이라 시작 거절 |
 * | `mine` | 내 세션이 이미 진행 중 — 이어 하기 / 중단하고 새로 시작 |
 * | `not-ready` | 훈련 환경 미준비로 시작 거절 |
 * | `not-ready-turn` | 2턴 첫 제출이 환경 미준비 — 같은 녹음으로 다시 보낼 수 있다 |
 * | `empty` | 2턴 첫 제출이 빈 전사 — 턴 번호가 늘지 않는다 |
 * | `unscored` | 2턴이 채점되지 않음 |
 * | `abort` | 2턴에서 "시스템 오류로 중단" |
 * | `calm` | 3턴에서 진정 종료 |
 *
 * 1턴 점수는 턴 응답에 바로 실리고, 2턴부터는 `PENDING`으로 왔다가 점수 조회로 받는다.
 */
type MockScenario =
  | "busy"
  | "mine"
  | "not-ready"
  | "not-ready-turn"
  | "empty"
  | "unscored"
  | "abort"
  | "calm";

const SCENARIOS: readonly MockScenario[] = [
  "busy",
  "mine",
  "not-ready",
  "not-ready-turn",
  "empty",
  "unscored",
  "abort",
  "calm",
];

type MockSession = {
  session: TrainingSession;
  scenario: MockScenario | null;
  /** 한 번만 보여 줄 실패를 이미 보여 줬는가. */
  failureShown: boolean;
  /** 턴 번호 → 점수가 "도착"하는 시각. 점수가 턴 응답보다 늦게 오는 것을 흉내 낸다. */
  scoreReadyAt: Record<number, number>;
  /** 확정된 턴 — 리포트·성장 기록 목업이 읽는다. */
  turns: MockTurn[];
};

type MockTurn = Pick<
  UtteranceTurnResult,
  "turnNumber" | "userTranscript" | "complainantLine" | "calmed"
>;

/**
 * 목업 세션 저장소. "같은 설정으로 다시 시작"은 문서를 새로 불러오므로
 * 리포트·성장 기록을 이어 보려면 `sessionStorage`에 남겨 둬야 한다.
 */
const STORAGE_KEY = "jinsang-stop:mock-training-sessions";
type MockStore = {
  sessions: MockSession[];
  nextSessionId: number;
  mineSessionId: number | null;
  mineCreated: boolean;
};

const sessions = new Map<number, MockSession>();
let nextSessionId = 1;
/** `mine` 시나리오에서 이미 진행 중인 내 세션. 중단하면 사라진다. */
let mineSessionId: number | null = null;
let mineCreated = false;
loadStore();

function loadStore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const store = JSON.parse(raw) as MockStore;
    store.sessions.forEach((it) => sessions.set(it.session.sessionId, it));
    nextSessionId = store.nextSessionId;
    mineSessionId = store.mineSessionId;
    mineCreated = store.mineCreated;
  } catch {
    // 서버 렌더링이나 저장소가 막힌 환경 — 빈 저장소로 시작한다.
  }
}

function saveStore() {
  const store: MockStore = {
    sessions: [...sessions.values()],
    nextSessionId,
    mineSessionId,
    mineCreated,
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 저장하지 못해도 이번 화면에서는 그대로 동작한다.
  }
}

/** 리포트·성장 기록 목업용 — 세션과 턴별 최종 점수. */
export function mockSessionRecords(): {
  session: TrainingSession;
  turns: (MockTurn & { score: TurnScore })[];
}[] {
  return [...sessions.values()].map((mock) => ({
    session: { ...mock.session },
    turns: mock.turns.map((turn) => ({
      ...turn,
      score: scoreOf(mock, turn.turnNumber),
    })),
  }));
}

const SUBMIT_DELAY_MS = 1500;
const SCORE_DELAY_MS = 1800;

export async function mockStartTrainingSession(
  request: TrainingSessionStartRequest,
): Promise<TrainingSession> {
  await wait(700);
  const scenario = readScenario();
  if (scenario === "busy" || (scenario === "mine" && ensureMineSession())) {
    throw new ApiError(
      409,
      TrainingSessionErrorCode.busy,
      "다른 훈련이 진행 중입니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  if (scenario === "not-ready") {
    throw notReady();
  }
  return createSession(request.cardId, request.intensity, scenario).session;
}

export async function mockFetchCurrentTrainingSession(): Promise<TrainingSession | null> {
  await wait(200);
  if (readScenario() === "mine" && mineSessionId !== null) {
    return { ...findSession(mineSessionId).session };
  }
  return null;
}

export async function mockFetchTrainingSession(
  sessionId: number,
): Promise<TrainingSession> {
  await wait(150);
  return { ...findSession(sessionId).session };
}

export async function mockAbortTrainingSession(
  sessionId: number,
): Promise<TrainingSession> {
  await wait(300);
  const mock = findSession(sessionId);
  if (mock.session.status !== "IN_PROGRESS") {
    throw new ApiError(
      409,
      "TRAINING_SESSION_NOT_IN_PROGRESS",
      "이미 끝난 훈련 세션입니다.",
    );
  }
  mock.session = {
    ...mock.session,
    status: "ABORTED",
    endedAt: new Date().toISOString(),
  };
  if (mineSessionId === sessionId) {
    mineSessionId = null;
  }
  saveStore();
  return { ...mock.session };
}

export async function mockSubmitUtteranceTurn(
  sessionId: number,
  _audio: Blob,
): Promise<UtteranceTurnResult> {
  await wait(SUBMIT_DELAY_MS);
  const mock = findSession(sessionId);
  const { session, scenario } = mock;
  if (session.status !== "IN_PROGRESS") {
    throw new ApiError(
      409,
      "TRAINING_SESSION_NOT_IN_PROGRESS",
      "이미 끝난 훈련 세션입니다.",
    );
  }
  const turnNumber = session.turnCount + 1;

  if (turnNumber === 2 && !mock.failureShown) {
    if (scenario === "empty") {
      mock.failureShown = true;
      throw new ApiError(
        422,
        TrainingSessionErrorCode.emptyTranscript,
        "말소리가 들리지 않았어요. 다시 말해 주세요.",
      );
    }
    if (scenario === "not-ready-turn") {
      mock.failureShown = true;
      throw notReady();
    }
  }
  if (scenario === "abort" && turnNumber === 2) {
    mock.session = {
      ...session,
      status: "SYSTEM_ERROR",
      endedAt: new Date().toISOString(),
    };
    saveStore();
    throw new ApiError(
      500,
      TrainingSessionErrorCode.endedBySystemError,
      "일시적인 문제로 훈련을 이어갈 수 없어 종료했습니다. 새 훈련을 시작해 주세요.",
    );
  }

  const calmed = scenario === "calm" && turnNumber === 3;
  const sessionStatus = calmed
    ? "CALMED"
    : turnNumber >= session.hardTurnLimit
      ? "TURN_LIMIT_REACHED"
      : "IN_PROGRESS";
  mock.session = {
    ...session,
    turnCount: turnNumber,
    status: sessionStatus,
    turnsToCalm: calmed ? turnNumber : null,
    endedAt: sessionStatus === "IN_PROGRESS" ? null : new Date().toISOString(),
  };

  const lines = calmed ? MOCK_CALMED_LINES : MOCK_COMPLAINANT_LINES;
  const line = lines[(turnNumber - 1) % lines.length];
  let score: TurnScore;
  if (turnNumber === 1) {
    score = scoreOf(mock, turnNumber);
  } else {
    mock.scoreReadyAt[turnNumber] = Date.now() + SCORE_DELAY_MS;
    score = pending(turnNumber);
  }
  const turn: MockTurn = {
    turnNumber,
    userTranscript: MOCK_TRANSCRIPTS[(turnNumber - 1) % MOCK_TRANSCRIPTS.length],
    complainantLine: line,
    calmed,
  };
  mock.turns.push(turn);
  saveStore();
  return {
    sessionId,
    ...turn,
    complainantAudio: silentWavBase64(Math.min(1500 + line.length * 80, 6000)),
    complainantAudioContentType: "audio/wav",
    score,
    sessionStatus,
    turnsToCalm: calmed ? turnNumber : null,
  };
}

export async function mockFetchTurnScore(
  sessionId: number,
  turnNumber: number,
): Promise<TurnScore> {
  await wait(150);
  const mock = findSession(sessionId);
  if (turnNumber < 1 || turnNumber > mock.session.turnCount) {
    throw new ApiError(404, "TURN_NOT_FOUND", "발화 턴을 찾을 수 없습니다.");
  }
  const readyAt = mock.scoreReadyAt[turnNumber] ?? 0;
  if (Date.now() < readyAt) {
    return pending(turnNumber);
  }
  return scoreOf(mock, turnNumber);
}

function createSession(
  cardId: number,
  intensity: Intensity,
  scenario: MockScenario | null,
  turnCount = 0,
): MockSession {
  const card = MOCK_OFFICIAL_CARDS.find((it) => it.cardId === cardId);
  if (!card) {
    throw new ApiError(404, "CARD_NOT_FOUND", "시나리오 카드를 찾을 수 없습니다.");
  }
  const mock: MockSession = {
    session: {
      sessionId: nextSessionId++,
      cardId,
      complainantRoleName: card.complainantRoleName,
      intensity,
      hardTurnLimit: card.hardTurnLimit,
      status: "IN_PROGRESS",
      turnCount,
      startedAt: new Date().toISOString(),
      turnsToCalm: null,
      endedAt: null,
    },
    scenario,
    failureShown: false,
    scoreReadyAt: {},
    turns: [],
  };
  sessions.set(mock.session.sessionId, mock);
  saveStore();
  return mock;
}

/** `mine` 시나리오의 내 세션을 한 번 만들어 둔다. 중단했으면 더 만들지 않는다. */
function ensureMineSession(): boolean {
  if (!mineCreated) {
    mineCreated = true;
    mineSessionId = createSession(1, 1, null, 2).session.sessionId;
  }
  return mineSessionId !== null;
}

function scoreOf(mock: MockSession, turnNumber: number): TurnScore {
  if (mock.scenario === "unscored" && turnNumber === 2) {
    return { ...pending(turnNumber), status: "FAILED" };
  }
  return { turnNumber, status: "SCORED", ...mockAxes(turnNumber) };
}

function pending(turnNumber: number): TurnScore {
  return {
    turnNumber,
    status: "PENDING",
    emotionalStability: null,
    empathyAcknowledgement: null,
    boundarySetting: null,
  };
}

function mockAxes(turnNumber: number): Record<AttitudeAxis, AxisScore> {
  const at = (axis: AttitudeAxis, base: number, step: number): AxisScore => ({
    score: Math.max(1, Math.min(5, Math.round(base + step * (turnNumber - 1)))),
    reason: MOCK_REASONS[axis][(turnNumber - 1) % 2],
  });
  return {
    emotionalStability: at("emotionalStability", 3, 0.5),
    empathyAcknowledgement: at("empathyAcknowledgement", 2, 1),
    boundarySetting: at("boundarySetting", 4, -0.5),
  };
}

function notReady(): ApiError {
  return new ApiError(
    503,
    TrainingSessionErrorCode.environmentNotReady,
    "훈련 환경이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.",
  );
}

function findSession(sessionId: number): MockSession {
  const mock = sessions.get(sessionId);
  if (!mock) {
    throw new ApiError(404, "TRAINING_SESSION_NOT_FOUND", "훈련 세션을 찾을 수 없습니다.");
  }
  return mock;
}

function readScenario(): MockScenario | null {
  const value = new URLSearchParams(window.location.search).get("mock");
  return SCENARIOS.find((it) => it === value) ?? null;
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
  "불편을 드려 죄송합니다 손님, 어떤 점이 문제였는지 말씀해 주시겠어요?",
  "상한 음식을 드셨다니 많이 놀라셨겠어요. 다만 영수증이 없으면 현금 환불은 어렵습니다.",
  "대신 결제 내역을 같이 찾아보거나 같은 상품으로 교환해 드릴 수 있어요.",
  "점장님께 전달은 해 드리겠지만, 환불 기준은 똑같이 적용됩니다.",
];

const MOCK_COMPLAINANT_LINES = [
  "아니, 어제 산 도시락이 이렇게 상해 있는데 말이 돼요? 당장 현금으로 돌려줘요.",
  "영수증이 뭐가 중요해요? 내가 여기서 샀다니까요!",
  "교환은 필요 없다니까요. 내 말을 듣긴 하는 거예요?",
  "그러니까 결국 안 해 주겠다는 거잖아요.",
];

const MOCK_CALMED_LINES = [
  ...MOCK_COMPLAINANT_LINES.slice(0, 2),
  "……알겠어요. 그럼 결제 내역부터 한번 찾아봐 줘요.",
];

const MOCK_REASONS: Record<AttitudeAxis, [string, string]> = {
  emotionalStability: [
    "언성이 높아진 뒤에도 같은 속도와 어조를 유지했다.",
    "몰아붙이는 말에 반박하지 않고 차분히 이어 갔다.",
  ],
  empathyAcknowledgement: [
    "요구를 판단하기 전에 불편했던 점을 먼저 물었다.",
    "놀랐을 감정을 말로 받아 주었다.",
  ],
  boundarySetting: [
    "환불이 어렵다는 점을 돌려 말하지 않고 전했다.",
    "기준을 되풀이했지만 대안 제시가 늦었다.",
  ],
};
