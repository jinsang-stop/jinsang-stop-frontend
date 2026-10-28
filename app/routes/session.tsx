import { Link, redirect, useRevalidator } from "react-router";

import type { Route } from "./+types/session";
import { ApiError, toUserMessage } from "~/api/errors";
import { ErrorNotice } from "~/components/ErrorNotice";
import { Page } from "~/components/Page";
import { fetchOfficialCard } from "~/officialCard/api";
import { INTENSITIES } from "~/officialCard/types";
import type { Intensity, OfficialCard } from "~/officialCard/types";
import { AttitudeScorePanel } from "~/trainingSession/AttitudeScorePanel";
import type { ScorePanelStatus } from "~/trainingSession/AttitudeScorePanel";
import { SpeakControl } from "~/trainingSession/SpeakControl";
import { TurnLog } from "~/trainingSession/TurnLog";
import { TrainingSessionErrorCode, isUnscored } from "~/trainingSession/types";
import type {
  TrainingSession,
  TrainingSessionStatus,
  TurnScore,
} from "~/trainingSession/types";
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
  const session = useTrainingSession(card.cardId, intensity);
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
          cardId={card.cardId}
          onRetry={session.retryStart}
        />
      </SessionFrame>
    );
  }

  if (phase.kind === "ownSessionInProgress") {
    return (
      <SessionFrame card={card} intensity={intensity}>
        <OwnSessionInProgress
          current={phase.session}
          card={card}
          intensity={intensity}
          onResume={() => session.resume(phase.session)}
          onAbortAndRestart={() => session.abortAndRestart(phase.session)}
        />
      </SessionFrame>
    );
  }

  if (phase.kind === "aborted") {
    return (
      <SessionFrame card={card} intensity={intensity}>
        <Aborted
          error={phase.error}
          sessionId={phase.sessionId}
          card={card}
          intensity={intensity}
        />
      </SessionFrame>
    );
  }

  if (phase.kind === "ended") {
    return (
      <SessionFrame card={card} intensity={intensity}>
        <Ended
          sessionId={phase.sessionId}
          status={phase.status}
          turnsToCalm={phase.turnsToCalm}
          card={card}
          intensity={intensity}
        />
      </SessionFrame>
    );
  }

  const { turns, scores, activity, turnCount } = session;
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

  /** 녹음 중이면 녹음을 버리고(전송하지 않는다) 세션을 끝낸다. */
  function abort() {
    recorder.discard();
    void session.abort();
  }

  return (
    <SessionFrame
      card={card}
      intensity={intensity}
      turnCount={turnCount}
      hardTurnLimit={phase.session.hardTurnLimit}
      onAbort={abort}
    >
      <AttitudeScorePanel {...scoreView} />

      <div className="mt-4 flex flex-col rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="max-h-[55vh] min-h-56 overflow-y-auto">
          {turns.length === 0 && turnCount > 0 && (
            <p className="border-b border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-800">
              이어 하는 훈련입니다. 앞선 {turnCount}턴의 대화는 이 화면에 다시
              나오지 않습니다.
            </p>
          )}
          <TurnLog
            entries={turns.map((turn) => ({
              ...turn,
              unscored:
                scores[turn.turnNumber] !== undefined &&
                isUnscored(scores[turn.turnNumber]),
            }))}
            complainantRoleName={phase.session.complainantRoleName}
            submitting={activity === "submitting"}
            speakingTurnNumber={session.speakingTurnNumber}
          />
        </div>
        <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
          {session.notice && (
            <TurnNotice
              notice={session.notice}
              onResend={session.resendUnsentTurn}
            />
          )}
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
            complainantRoleName={phase.session.complainantRoleName}
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
  hardTurnLimit,
  onAbort,
  children,
}: {
  card: OfficialCard;
  intensity: Intensity;
  /** 지금까지 확정된 `발화 턴` 수. 세션이 진행 중일 때만 보여준다. */
  turnCount?: number;
  hardTurnLimit?: number;
  /** 진행 중일 때만 넘긴다 — 중단 버튼을 보여준다. */
  onAbort?: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to={`/cards/${card.cardId}`}
            className="text-sm text-gray-600 underline dark:text-gray-400"
          >
            ← 카드로
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {card.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            상대: {card.complainantRoleName} · 강도 {intensity}단계
          </p>
        </div>
        <div className="flex items-center gap-3">
          {turnCount !== undefined && (
            <p className="rounded-full border border-gray-200 px-3 py-1 text-sm tabular-nums text-gray-700 dark:border-gray-800 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-gray-50">
                {turnCount}
              </span>{" "}
              / {hardTurnLimit ?? card.hardTurnLimit}턴
            </p>
          )}
          {onAbort && (
            // 확인창 없이 한 번에 끝낸다(ADR-0005 — 언제든 즉시 중단).
            <button
              type="button"
              onClick={onAbort}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
            >
              훈련 중단
            </button>
          )}
        </div>
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
  cardId: number;
  onRetry: () => void;
}) {
  const busy =
    error instanceof ApiError && error.code === TrainingSessionErrorCode.busy;
  const notReady =
    error instanceof ApiError &&
    error.code === TrainingSessionErrorCode.environmentNotReady;

  if (!busy && !notReady) {
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
        {busy
          ? "지금은 훈련을 시작할 수 없습니다"
          : "훈련 환경이 준비되지 않았습니다"}
      </h2>
      <p className="mt-2 text-gray-700 dark:text-gray-300" role="status">
        {toUserMessage(error)}
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {busy
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

/**
 * 진행 중인 세션이 내 것이다(새로고침했거나 다른 탭에서 시작). 같은 카드·강도면
 * 그대로 이어 하고, 다르면 그 세션 화면으로 가거나 중단하고 새로 시작한다.
 */
function OwnSessionInProgress({
  current,
  card,
  intensity,
  onResume,
  onAbortAndRestart,
}: {
  current: TrainingSession;
  card: OfficialCard;
  intensity: Intensity;
  onResume: () => void;
  onAbortAndRestart: () => void;
}) {
  const sameSetting =
    current.cardId === card.cardId && current.intensity === intensity;
  const primaryClassName =
    "rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300";

  return (
    <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        진행 중인 내 훈련이 있습니다
      </h2>
      <p className="mt-2 text-gray-700 dark:text-gray-300">
        {sameSetting
          ? `이 카드로 ${current.turnCount}턴까지 진행한 훈련입니다.`
          : `다른 설정(강도 ${current.intensity}단계)으로 ${current.turnCount}턴까지 진행한 훈련입니다.`}{" "}
        이어 하거나, 중단하고 지금 고른 설정으로 새로 시작할 수 있습니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        {sameSetting ? (
          <button type="button" onClick={onResume} className={primaryClassName}>
            이어 하기
          </button>
        ) : (
          // 그 세션의 카드·강도 화면으로 가면 다시 이 안내를 거쳐 이어 하게 된다.
          <a
            href={`/cards/${current.cardId}/session?intensity=${current.intensity}`}
            className={primaryClassName}
          >
            그 훈련 이어 하기
          </a>
        )}
        <button
          type="button"
          onClick={onAbortAndRestart}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          중단하고 새로 시작
        </button>
      </div>
    </div>
  );
}

function Aborted({
  error,
  sessionId,
  card,
  intensity,
}: {
  error: unknown;
  sessionId: number;
  card: OfficialCard;
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
        <ReportLink sessionId={sessionId} />
        <RestartLink card={card} intensity={intensity} />
        <BackToCard cardId={card.cardId} />
      </div>
    </div>
  );
}

/** 종료 사유별 종료 화면. 사유마다 제목·설명·강조색이 다르다. */
function Ended({
  sessionId,
  status,
  turnsToCalm,
  card,
  intensity,
}: {
  sessionId: number;
  status: TrainingSessionStatus;
  turnsToCalm: number | null;
  card: OfficialCard;
  intensity: Intensity;
}) {
  const view = endedView(status, turnsToCalm, card);
  return (
    <div
      role="status"
      data-end-reason={status}
      className={`rounded-xl border p-6 ${view.className}`}
    >
      <p className="text-sm font-medium opacity-80">훈련 종료</p>
      <h2 className="mt-1 text-2xl font-bold">{view.title}</h2>
      {view.headline && (
        <p className="mt-4 text-4xl font-bold tabular-nums">{view.headline}</p>
      )}
      <p className="mt-3">{view.description}</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <ReportLink sessionId={sessionId} />
        <RestartLink card={card} intensity={intensity} />
        <BackToCard cardId={card.cardId} />
      </div>
    </div>
  );
}

function endedView(
  status: TrainingSessionStatus,
  turnsToCalm: number | null,
  card: OfficialCard,
): { title: string; headline?: string; description: string; className: string } {
  const neutral =
    "border-gray-200 text-gray-900 dark:border-gray-800 dark:text-gray-50";
  switch (status) {
    case "CALMED":
      return {
        title: "진정 종료",
        headline: turnsToCalm !== null ? `${turnsToCalm}턴` : undefined,
        description: `${card.complainantRoleName}이(가) 진정했습니다. 소요 턴 수가 성장 기록의 기준이 됩니다.`,
        className:
          "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50",
      };
    case "TURN_LIMIT_REACHED":
      return {
        title: "진정시키지 못한 채 종료",
        description: `최대 ${card.hardTurnLimit}턴 안에 ${card.complainantRoleName}이(가) 진정하지 않았습니다. 이 훈련은 성장 기록에 들어가지 않습니다.`,
        className:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50",
      };
    case "ABORTED":
      return {
        title: "훈련을 중단했습니다",
        description: "중단한 훈련은 성장 기록에 들어가지 않습니다. 준비되면 언제든 다시 시작할 수 있습니다.",
        className: neutral,
      };
    case "SYSTEM_ERROR":
      return {
        title: "시스템 오류로 중단",
        description: "사용자의 응대 때문이 아닙니다. 이 세션은 성장 기록에 들어가지 않습니다.",
        className: neutral,
      };
    default:
      return {
        title: "훈련이 끝났습니다",
        description: "이 세션은 성장 기록에 들어가지 않습니다.",
        className: neutral,
      };
  }
}

function TurnNotice({
  notice,
  onResend,
}: {
  notice: SessionNotice;
  onResend: () => void;
}) {
  if (notice.kind === "speakAgain") {
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
  if (notice.kind === "environmentNotReady") {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
      >
        <p>
          {toUserMessage(notice.error)}{" "}
          <span className="text-amber-700 dark:text-amber-300">
            (턴 수는 늘지 않았습니다)
          </span>
        </p>
        <button
          type="button"
          onClick={onResend}
          className="rounded-md border border-amber-400 px-3 py-1.5 font-medium hover:bg-amber-100 dark:hover:bg-amber-900"
        >
          같은 녹음 다시 보내기
        </button>
      </div>
    );
  }
  return <ErrorNotice error={notice.error} />;
}

function ReportLink({ sessionId }: { sessionId: number }) {
  return (
    <Link
      to={`/sessions/${sessionId}/report`}
      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
    >
      리포트 보기
    </Link>
  );
}

function RestartLink({
  card,
  intensity,
}: {
  card: OfficialCard;
  intensity: Intensity;
}) {
  return (
    // 같은 주소로 다시 들어가면 새 세션이 시작된다.
    <a
      href={`/cards/${card.cardId}/session?intensity=${intensity}`}
      className="rounded-md border border-current/20 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
    >
      같은 설정으로 다시 시작
    </a>
  );
}

function BackToCard({ cardId }: { cardId: number }) {
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
): {
  status: ScorePanelStatus;
  latest: TurnScore | null;
  previous: TurnScore | null;
} {
  const lastTurn = turns.at(-1);
  const successes = turns
    .map((turn) => scores[turn.turnNumber])
    .filter((score): score is TurnScore => score?.status === "SCORED");

  let status: ScorePanelStatus;
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
