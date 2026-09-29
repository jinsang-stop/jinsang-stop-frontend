import { Link, redirect, useRevalidator } from "react-router";

import type { Route } from "./+types/session";
import { ApiError, toUserMessage } from "~/api/errors";
import { ErrorNotice } from "~/components/ErrorNotice";
import { Page } from "~/components/Page";
import { fetchOfficialCard } from "~/officialCard/api";
import { INTENSITIES } from "~/officialCard/types";
import type { Intensity, OfficialCardDetail } from "~/officialCard/types";
import { AttitudeScorePanel } from "~/trainingSession/AttitudeScorePanel";
import type { ScoreStatus } from "~/trainingSession/AttitudeScorePanel";
import { SpeakControl } from "~/trainingSession/SpeakControl";
import { TurnLog } from "~/trainingSession/TurnLog";
import { TrainingSessionErrorCode, isUnscored } from "~/trainingSession/types";
import type { TurnScore } from "~/trainingSession/types";
import { useRecorder } from "~/trainingSession/useRecorder";
import { useTrainingSession } from "~/trainingSession/useTrainingSession";
import type {
  CompletedTurn,
  SessionNotice,
} from "~/trainingSession/useTrainingSession";

export function meta(_: Route.MetaArgs) {
  return [{ title: "훈련 세션 — 진상 멈춰" }];
}

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  const intensity = parseIntensity(
    new URL(request.url).searchParams.get("intensity"),
  );
  if (intensity === null) {
    // 강도를 고르지 않고 들어왔다 — 고지 확인을 건너뛰지 않게 선택 화면으로 돌려보낸다.
    throw redirect(`/cards/${encodeURIComponent(params.cardId)}`);
  }
  return { card: await fetchOfficialCard(params.cardId), intensity };
}

export function HydrateFallback() {
  return <Page title="훈련 세션">불러오는 중…</Page>;
}

export default function Session({ loaderData }: Route.ComponentProps) {
  const { card, intensity } = loaderData;
  const session = useTrainingSession(card.id, intensity);
  const recorder = useRecorder();

  const { phase } = session;

  if (phase.kind === "starting") {
    return (
      <SessionFrame card={card} intensity={intensity}>
        <p
          className="flex items-center gap-2 rounded-xl border border-gray-200 p-6 text-gray-700 dark:border-gray-800 dark:text-gray-300"
          aria-live="polite"
        >
          <span className="size-2 animate-pulse rounded-full bg-gray-400" />
          훈련 세션을 준비하는 중…
        </p>
      </SessionFrame>
    );
  }

  if (phase.kind === "startFailed") {
    return (
      <SessionFrame card={card} intensity={intensity}>
        <StartFailed
          error={phase.error}
          cardId={card.id}
          onRetry={session.retryStart}
        />
      </SessionFrame>
    );
  }

  if (phase.kind === "aborted") {
    return (
      <SessionFrame card={card} intensity={intensity}>
        <Aborted error={phase.error} card={card} intensity={intensity} />
      </SessionFrame>
    );
  }

  const { turns, scores, activity } = session;
  const scoreView = toScoreView(turns, scores);

  async function startSpeaking() {
    session.clearNotice();
    await recorder.start();
  }

  async function stopSpeaking() {
    const audio = await recorder.stop();
    if (audio) {
      await session.submitTurn(audio);
    }
  }

  return (
    <SessionFrame
      card={card}
      intensity={intensity}
      turnCount={turns.length}
    >
      <AttitudeScorePanel {...scoreView} />

      <div className="mt-4 flex flex-col rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="max-h-[55vh] min-h-56 overflow-y-auto">
          <TurnLog
            entries={turns.map((turn) => ({
              ...turn,
              unscored:
                scores[turn.turnNumber] !== undefined &&
                isUnscored(scores[turn.turnNumber]),
            }))}
            complainantDisplayRole={card.complainantDisplayRole}
            submitting={activity === "submitting"}
            speakingTurnNumber={session.speakingTurnNumber}
          />
        </div>
        <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
          {session.notice && <TurnNotice notice={session.notice} />}
          <SpeakControl
            recorderStatus={recorder.status}
            recorderError={recorder.error}
            elapsedMs={recorder.elapsedMs}
            waitingFor={
              activity === "submitting"
                ? "response"
                : activity === "complainantSpeaking"
                  ? "complainantSpeech"
                  : null
            }
            complainantDisplayRole={card.complainantDisplayRole}
            onStart={startSpeaking}
            onStop={stopSpeaking}
          />
        </div>
      </div>
    </SessionFrame>
  );
}

/** 세션 화면 머리 — 카드 이름, 상대 역할명, 강도, 턴 수. */
function SessionFrame({
  card,
  intensity,
  turnCount,
  children,
}: {
  card: OfficialCardDetail;
  intensity: Intensity;
  /** 지금까지 닫힌 `발화 턴` 수. 세션이 진행 중일 때만 보여준다. */
  turnCount?: number;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to={`/cards/${card.id}`}
            className="text-sm text-gray-600 underline dark:text-gray-400"
          >
            ← 카드로
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {card.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            상대: {card.complainantDisplayRole} · 강도 {intensity}단계
          </p>
        </div>
        {turnCount !== undefined && (
          <p className="rounded-full border border-gray-200 px-3 py-1 text-sm tabular-nums text-gray-700 dark:border-gray-800 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-gray-50">
              {turnCount}
            </span>{" "}
            / {card.hardTurnLimit}턴
          </p>
        )}
      </header>
      {children}
    </main>
  );
}

function StartFailed({
  error,
  cardId,
  onRetry,
}: {
  error: unknown;
  cardId: string;
  onRetry: () => void;
}) {
  const inProgress =
    error instanceof ApiError &&
    error.code === TrainingSessionErrorCode.sessionInProgress;
  const notReady =
    error instanceof ApiError &&
    error.code === TrainingSessionErrorCode.environmentNotReady;

  if (!inProgress && !notReady) {
    return (
      <div className="space-y-4">
        <ErrorNotice error={error} onRetry={onRetry} />
        <BackToCard cardId={cardId} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        {inProgress
          ? "지금은 훈련을 시작할 수 없습니다"
          : "훈련 환경이 준비되지 않았습니다"}
      </h2>
      <p className="mt-2 text-gray-700 dark:text-gray-300" role="status">
        {toUserMessage(error)}
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {inProgress
          ? "한 번에 한 사람만 훈련할 수 있습니다. 화면이 멈춘 것이 아니니 잠시 뒤 다시 시도해 주세요."
          : "음성·대화 환경이 켜지면 바로 시작할 수 있습니다."}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          다시 시도
        </button>
        <BackToCard cardId={cardId} />
      </div>
    </div>
  );
}

function Aborted({
  error,
  card,
  intensity,
}: {
  error: unknown;
  card: OfficialCardDetail;
  intensity: Intensity;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-gray-200 p-6 dark:border-gray-800"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        시스템 오류로 중단
      </h2>
      <p className="mt-2 text-gray-700 dark:text-gray-300">
        {toUserMessage(error)}
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        사용자의 응대 때문이 아닙니다. 이 세션은 성장 기록에 들어가지 않습니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        {/* 같은 주소로 다시 들어가면 새 세션이 시작된다. */}
        <a
          href={`/cards/${card.id}/session?intensity=${intensity}`}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          같은 설정으로 다시 시작
        </a>
        <BackToCard cardId={card.id} />
      </div>
    </div>
  );
}

function TurnNotice({ notice }: { notice: SessionNotice }) {
  if (notice.kind === "emptyTranscript") {
    return (
      <p
        role="status"
        className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
      >
        {toUserMessage(notice.error)}{" "}
        <span className="text-amber-700 dark:text-amber-300">
          (턴 수는 늘지 않았습니다)
        </span>
      </p>
    );
  }
  return <ErrorNotice error={notice.error} />;
}

function BackToCard({ cardId }: { cardId: string }) {
  return (
    <Link to={`/cards/${cardId}`} className="text-sm underline">
      카드로 돌아가기
    </Link>
  );
}

/** 대화 기록과 도착한 점수로 3축 패널에 넘길 값을 만든다. */
function toScoreView(
  turns: CompletedTurn[],
  scores: Record<number, TurnScore>,
): { status: ScoreStatus; latest: TurnScore | null; previous: TurnScore | null } {
  const lastTurn = turns.at(-1);
  const successes = turns
    .map((turn) => scores[turn.turnNumber])
    .filter((score): score is TurnScore => !!score && !isUnscored(score));

  let status: ScoreStatus;
  if (!lastTurn) {
    status = { kind: "waiting" };
  } else {
    const score = scores[lastTurn.turnNumber];
    const turnNumber = lastTurn.turnNumber;
    status = !score
      ? { kind: "pending", turnNumber }
      : isUnscored(score)
        ? { kind: "unscored", turnNumber }
        : { kind: "scored", turnNumber };
  }

  return {
    status,
    latest: successes.at(-1) ?? null,
    previous: successes.at(-2) ?? null,
  };
}

function parseIntensity(value: string | null): Intensity | null {
  return INTENSITIES.find((it) => String(it) === value) ?? null;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const revalidator = useRevalidator();
  return (
    <Page title="훈련 세션">
      <ErrorNotice error={error} onRetry={() => revalidator.revalidate()} />
      <p className="mt-4">
        <Link to="/" className="text-sm underline">
          공식 카드 목록으로
        </Link>
      </p>
    </Page>
  );
}
