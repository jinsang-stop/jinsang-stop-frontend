import {
  ATTITUDE_AXES,
  ATTITUDE_SCORE_MAX,
  ATTITUDE_SCORE_MIN,
} from "./types";
import type { TurnScore } from "./types";

/**
 * 가장 최근 턴의 채점 상태.
 * - `waiting`: 아직 제출한 턴이 없다.
 * - `pending`: 그 턴의 점수가 아직 도착하지 않았다 — 점수는 턴 응답보다 늦게 올 수 있다.
 * - `scored`: 그 턴의 점수가 표시되고 있다.
 * - `unscored`: 그 턴은 채점되지 않았다. 마지막 성공값을 유지한다.
 */
export type ScoreStatus =
  | { kind: "waiting" }
  | { kind: "pending"; turnNumber: number }
  | { kind: "scored"; turnNumber: number }
  | { kind: "unscored"; turnNumber: number };

/**
 * `태도 3축` 실시간 표시.
 *
 * 세 축을 따로 보여주고 합산 점수는 만들지 않는다(ADR-0004). 채점되지 않은 턴은
 * 0으로 떨어뜨리지 않고 마지막으로 성공한 점수를 유지한 채 "채점되지 않음"을 붙인다.
 */
export function AttitudeScorePanel({
  status,
  latest,
  previous,
}: {
  status: ScoreStatus;
  /** 마지막으로 채점에 성공한 턴의 점수. 없으면 세 축 모두 `정보 없음`이다. */
  latest: TurnScore | null;
  /** 그 직전에 채점에 성공한 턴의 점수 — 변화량 표시에 쓴다. */
  previous: TurnScore | null;
}) {
  const stale = status.kind === "unscored" || status.kind === "pending";

  return (
    <section
      aria-labelledby="attitude-score-title"
      className="rounded-xl border border-gray-200 p-4 sm:p-5 dark:border-gray-800"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="attitude-score-title"
          className="font-semibold text-gray-900 dark:text-gray-50"
        >
          태도 3축
        </h2>
        <StatusLabel status={status} latest={latest} />
      </div>

      {status.kind === "unscored" && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {status.turnNumber}턴은 채점되지 않았습니다.
          {latest
            ? ` ${latest.turnNumber}턴 점수를 그대로 보여줍니다.`
            : " 아직 표시할 점수가 없습니다."}
        </p>
      )}

      <ul className="mt-4 grid grid-cols-3 gap-4 sm:gap-6">
        {ATTITUDE_AXES.map(({ axis, label }) => {
          const current = latest?.axes[axis];
          const score = current?.score ?? null;
          const before = previous?.axes[axis].score ?? null;
          const delta = score !== null && before !== null ? score - before : null;
          return (
            <li key={axis}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {label}
                </span>
                <span className="tabular-nums">
                  {score === null ? (
                    <span className="text-gray-500">정보 없음</span>
                  ) : (
                    <>
                      {delta !== null && delta !== 0 && (
                        <span
                          className={`mr-1.5 text-xs ${
                            delta > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {delta > 0 ? `▲${delta}` : `▼${-delta}`}
                        </span>
                      )}
                      <span className="font-semibold text-gray-900 dark:text-gray-50">
                        {score}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <div
                role="meter"
                aria-label={label}
                aria-valuemin={ATTITUDE_SCORE_MIN}
                aria-valuemax={ATTITUDE_SCORE_MAX}
                aria-valuenow={score ?? undefined}
                aria-valuetext={score === null ? "정보 없음" : undefined}
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
              >
                {score !== null && (
                  <div
                    className={`h-full rounded-full bg-gray-900 transition-[width] duration-700 ease-out dark:bg-gray-100 ${
                      stale ? "opacity-40" : ""
                    }`}
                    style={{ width: `${toPercent(score)}%` }}
                  />
                )}
              </div>
              {current?.rationale && (
                <p
                  className={`mt-1.5 hidden text-xs text-gray-600 sm:block dark:text-gray-400 ${
                    stale ? "opacity-60" : ""
                  }`}
                >
                  {current.rationale}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatusLabel({
  status,
  latest,
}: {
  status: ScoreStatus;
  latest: TurnScore | null;
}) {
  const className = "text-xs text-gray-500";
  switch (status.kind) {
    case "waiting":
      return <span className={className}>첫 발화 뒤에 나옵니다</span>;
    case "pending":
      return (
        <span className={`${className} animate-pulse`} aria-live="polite">
          {status.turnNumber}턴 채점 중…
        </span>
      );
    case "scored":
      return <span className={className}>{status.turnNumber}턴 기준</span>;
    case "unscored":
      return (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          채점되지 않음{latest ? ` · ${latest.turnNumber}턴 기준` : ""}
        </span>
      );
  }
}

function toPercent(score: number): number {
  const ratio =
    (score - ATTITUDE_SCORE_MIN) / (ATTITUDE_SCORE_MAX - ATTITUDE_SCORE_MIN);
  return Math.max(0, Math.min(100, ratio * 100));
}
