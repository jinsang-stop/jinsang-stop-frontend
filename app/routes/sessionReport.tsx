import { Link, useRevalidator } from "react-router";

import type { Route } from "./+types/sessionReport";
import { ApiError, toUserMessage } from "~/api/errors";
import { ErrorNotice } from "~/components/ErrorNotice";
import { Page } from "~/components/Page";
import { fetchSessionReport } from "~/sessionReport/api";
import { REPORT_NOT_READY_CODE, retryPath } from "~/sessionReport/types";
import type { ReportTurn, SessionReport } from "~/sessionReport/types";
import { ATTITUDE_AXES } from "~/trainingSession/types";
import type { AttitudeAxis } from "~/trainingSession/types";

export function meta(_: Route.MetaArgs) {
  return [{ title: "세션 리포트 — 진상 멈춰" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return { report: await fetchSessionReport(params.sessionId) };
}

export function HydrateFallback() {
  return <Page title="세션 리포트">불러오는 중…</Page>;
}

const END_REASON_LABEL: Record<SessionReport["endReason"], string> = {
  CALMED: "진정 종료",
  TURN_LIMIT_REACHED: "진정시키지 못한 채 종료",
  ABORTED: "사용자 중단",
  SYSTEM_ERROR: "시스템 오류로 중단",
  ABANDONED: "방치되어 정리됨",
};

/**
 * `세션 리포트` — 턴마다 무엇을 말했고 어느 축이 흔들렸는지, 그리고 성장 기록에
 * 들어갔는지(안 들어갔으면 왜인지)를 보여 준다. 세 축을 합친 점수는 만들지 않는다.
 */
export default function SessionReportScreen({ loaderData }: Route.ComponentProps) {
  const { report } = loaderData;
  const drops = findDrops(report.turns);

  return (
    <Page
      title="세션 리포트"
      description={`${report.cardName} · 강도 ${report.intensity}단계`}
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <div
          data-end-reason={report.endReason}
          className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
        >
          <p className="text-sm text-gray-500">종료 사유</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {END_REASON_LABEL[report.endReason]}
          </p>
          <p className="mt-3 text-sm text-gray-500">소요 턴 수</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-50">
            {report.turnsToCalm !== null ? `${report.turnsToCalm}턴` : "—"}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            {formatTime(report.startedAt)} ~ {formatTime(report.endedAt)} ·{" "}
            {report.turns.length}턴 진행
          </p>
        </div>
        <GrowthRecordBox report={report} />
      </section>

      <AxisAverages report={report} />

      <section aria-labelledby="timeline-title" className="mt-8">
        <h2
          id="timeline-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-50"
        >
          턴별 기록
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          앞선 턴보다 점수가 내려간 축은 붉게 표시됩니다.
        </p>
        {report.turns.length === 0 ? (
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            확정된 턴이 없습니다.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {report.turns.map((turn) => (
              <TurnRow
                key={turn.turnNumber}
                turn={turn}
                complainantRoleName={report.complainantRoleName}
                drops={drops[turn.turnNumber] ?? {}}
              />
            ))}
          </ol>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          to={retryPath(report.cardId, report.intensity)}
          className="rounded-md bg-gray-900 px-5 py-2.5 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          같은 카드 재도전
        </Link>
        <Link
          to={`/cards/${report.cardId}/growth`}
          className="text-sm underline"
        >
          이 카드의 성장 기록
        </Link>
        <Link to="/" className="text-sm underline">
          공식 카드 목록
        </Link>
      </div>
    </Page>
  );
}

function GrowthRecordBox({ report }: { report: SessionReport }) {
  const { included, reasons } = report.growthRecord;
  return (
    <div
      data-growth-included={included}
      className={`rounded-xl border p-5 ${
        included
          ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50"
          : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50"
      }`}
    >
      <p className="text-sm opacity-80">성장 기록</p>
      <p className="mt-1 text-lg font-semibold">
        {included ? "성장 기록에 반영됐습니다" : "성장 기록에 반영되지 않았습니다"}
      </p>
      {included ? (
        <p className="mt-2 text-sm">
          같은 카드·같은 강도의 소요 턴 수 그래프에 점이 하나 늘었습니다.
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {reasons.map((reason) => (
            <li key={reason.code}>{reason.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AxisAverages({ report }: { report: SessionReport }) {
  return (
    <section className="mt-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
      <h2 className="text-sm font-medium text-gray-500">
        축별 평균 <span className="font-normal">(채점된 턴 기준 · 보조 지표)</span>
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-4">
        {ATTITUDE_AXES.map(({ axis, label }) => {
          const value = report.axisAverages[axis];
          return (
            <div key={axis}>
              <dt className="text-sm text-gray-700 dark:text-gray-300">{label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                {value === null ? (
                  <span className="text-base font-normal text-gray-500">정보 없음</span>
                ) : (
                  <>
                    {value.toFixed(1)}
                    <span className="text-sm font-normal text-gray-500"> / 5</span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function TurnRow({
  turn,
  complainantRoleName,
  drops,
}: {
  turn: ReportTurn;
  complainantRoleName: string;
  drops: Partial<Record<AttitudeAxis, number>>;
}) {
  const scored = turn.score.status === "SCORED";
  const hasDrop = Object.keys(drops).length > 0;
  return (
    <li
      data-turn={turn.turnNumber}
      className={`rounded-xl border p-4 ${
        hasDrop
          ? "border-rose-300 dark:border-rose-800"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-gray-900 dark:text-gray-50">
          {turn.turnNumber}턴
        </span>
        {turn.calmed && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
            진정
          </span>
        )}
        {!scored && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-100">
            채점되지 않음
          </span>
        )}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs text-gray-500">나</dt>
          <dd className="text-gray-900 dark:text-gray-50">{turn.userTranscript}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">{complainantRoleName}</dt>
          <dd className="text-gray-700 dark:text-gray-300">{turn.complainantLine}</dd>
        </div>
      </dl>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {ATTITUDE_AXES.map(({ axis, label }) => {
          const axisScore = turn.score[axis];
          const drop = drops[axis];
          return (
            <li
              key={axis}
              data-axis={axis}
              data-drop={drop !== undefined}
              className={`rounded-lg px-3 py-2 text-sm ${
                drop !== undefined
                  ? "bg-rose-50 text-rose-950 dark:bg-rose-950 dark:text-rose-50"
                  : "bg-gray-50 dark:bg-gray-900"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{label}</span>
                <span className="tabular-nums">
                  {axisScore === null ? (
                    <span className="text-gray-500">정보 없음</span>
                  ) : (
                    <>
                      {drop !== undefined && (
                        <span className="mr-1 text-xs text-rose-600 dark:text-rose-400">
                          ▼{drop}
                        </span>
                      )}
                      <span className="font-semibold">{axisScore.score}</span>
                    </>
                  )}
                </span>
              </div>
              {axisScore && (
                <p className="mt-1 text-xs opacity-80">{axisScore.reason}</p>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/**
 * 턴 번호 → 직전 채점된 턴보다 내려간 축과 내려간 폭.
 * 채점되지 않은 턴은 건너뛰고 그 앞의 채점된 턴과 비교한다.
 */
function findDrops(
  turns: ReportTurn[],
): Record<number, Partial<Record<AttitudeAxis, number>>> {
  const result: Record<number, Partial<Record<AttitudeAxis, number>>> = {};
  let previous: ReportTurn["score"] | null = null;
  for (const turn of turns) {
    if (turn.score.status !== "SCORED") {
      continue;
    }
    if (previous) {
      for (const { axis } of ATTITUDE_AXES) {
        const before = previous[axis]?.score;
        const now = turn.score[axis]?.score;
        if (before !== undefined && now !== undefined && now < before) {
          (result[turn.turnNumber] ??= {})[axis] = before - now;
        }
      }
    }
    previous = turn.score;
  }
  return result;
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const revalidator = useRevalidator();
  const notReady =
    error instanceof ApiError && error.code === REPORT_NOT_READY_CODE;
  return (
    <Page title="세션 리포트">
      {notReady ? (
        <p role="status" className="text-gray-700 dark:text-gray-300">
          {toUserMessage(error)}
        </p>
      ) : (
        <ErrorNotice error={error} onRetry={() => revalidator.revalidate()} />
      )}
      <p className="mt-4">
        <Link to="/" className="text-sm underline">
          공식 카드 목록으로
        </Link>
      </p>
    </Page>
  );
}

