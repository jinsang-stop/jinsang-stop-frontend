import { Link, useRevalidator } from "react-router";

import type { Route } from "./+types/growthRecord";
import { ErrorNotice } from "~/components/ErrorNotice";
import { Page } from "~/components/Page";
import { fetchGrowthRecord } from "~/growthRecord/api";
import { GrowthChart, shortDate } from "~/growthRecord/GrowthChart";
import type { GrowthRecord } from "~/growthRecord/types";
import { fetchOfficialCard } from "~/officialCard/api";
import { INTENSITIES } from "~/officialCard/types";
import type { OfficialCard } from "~/officialCard/types";
import { retryPath } from "~/sessionReport/types";

export function meta(_: Route.MetaArgs) {
  return [{ title: "성장 기록 — 진상 멈춰" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const card = await fetchOfficialCard(params.cardId);
  // 강도마다 따로 받는다 — 강도가 다른 세션은 한 시계열에 섞지 않는다.
  const records = await Promise.all(
    INTENSITIES.map((intensity) => fetchGrowthRecord(card.cardId, intensity)),
  );
  return { card, records };
}

export function HydrateFallback() {
  return <Page title="성장 기록">불러오는 중…</Page>;
}

/**
 * `성장 기록` — 같은 카드·같은 `강도`에서 `소요 턴 수`가 줄었는지 본다.
 * 강도마다 차트를 따로 그려 서로 다른 강도의 점이 한 선으로 이어지지 않게 한다.
 */
export default function GrowthRecordScreen({ loaderData }: Route.ComponentProps) {
  const { card, records } = loaderData;
  const withPoints = records.filter((record) => record.points.length > 0);
  const empty = records.filter((record) => record.points.length === 0);

  return (
    <Page
      title="성장 기록"
      description={`${card.name} — 진정 종료까지 걸린 턴 수가 줄어드는지 봅니다. 아래로 갈수록 빨리 진정시킨 것입니다.`}
    >
      <Link to={`/cards/${card.cardId}`} className="text-sm underline">
        ← 카드로
      </Link>

      {records.some((record) => !record.boundaryThresholdConfigured) && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          경계 설정 기준이 아직 정해지지 않아 성장 기록 편입을 보류하고 있습니다.
        </p>
      )}

      {withPoints.length === 0 && (
        <p className="mt-6 text-gray-600 dark:text-gray-400">
          아직 성장 기록에 들어간 훈련이 없습니다. 진정 종료로 끝나고 모든 턴이
          채점된 훈련만 점이 됩니다.
        </p>
      )}

      <div className="mt-6 space-y-6">
        {withPoints.map((record) => (
          <IntensitySection key={record.intensity} record={record} card={card} />
        ))}
      </div>

      {empty.length > 0 && withPoints.length > 0 && (
        <p className="mt-6 text-sm text-gray-500">
          {empty.map((record) => `${record.intensity}단계`).join(" · ")}는 아직
          기록이 없습니다.
        </p>
      )}

      <div className="mt-8">
        <Link
          to={retryPath(card.cardId, withPoints.at(-1)?.intensity ?? 1)}
          className="rounded-md bg-gray-900 px-5 py-2.5 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          같은 카드 재도전
        </Link>
      </div>
    </Page>
  );
}

function IntensitySection({
  record,
  card,
}: {
  record: GrowthRecord;
  card: OfficialCard;
}) {
  const first = record.points[0];
  const last = record.points.at(-1)!;
  const change = last.turnsToCalm - first.turnsToCalm;
  return (
    <section
      data-intensity={record.intensity}
      aria-labelledby={`growth-${record.intensity}`}
      className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id={`growth-${record.intensity}`}
          className="font-semibold text-gray-900 dark:text-gray-50"
        >
          강도 {record.intensity}단계 · 소요 턴 수
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {record.points.length}회
          {record.points.length > 1 &&
            (change < 0
              ? ` · 처음보다 ${-change}턴 빨라짐`
              : change > 0
                ? ` · 처음보다 ${change}턴 늘어남`
                : " · 처음과 같음")}
        </p>
      </div>
      <div className="mt-3">
        <GrowthChart
          points={record.points}
          hardTurnLimit={card.hardTurnLimit}
          label={`강도 ${record.intensity}단계 소요 턴 수 변화`}
        />
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
          표로 보기
        </summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-gray-500">
            <tr>
              <th className="py-1 font-normal">종료</th>
              <th className="py-1 font-normal">소요 턴 수</th>
              <th className="py-1 font-normal">정서 안정</th>
              <th className="py-1 font-normal">공감 인정</th>
              <th className="py-1 font-normal">경계 설정</th>
            </tr>
          </thead>
          <tbody>
            {record.points.map((point) => (
              <tr
                key={point.sessionId}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="py-1">
                  <Link
                    to={`/sessions/${point.sessionId}/report`}
                    className="underline"
                  >
                    {shortDate(point.endedAt)}
                  </Link>
                </td>
                <td className="py-1">{point.turnsToCalm}</td>
                <td className="py-1">{point.emotionalStability.toFixed(1)}</td>
                <td className="py-1">{point.empathyAcknowledgement.toFixed(1)}</td>
                <td className="py-1">{point.boundarySetting.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const revalidator = useRevalidator();
  return (
    <Page title="성장 기록">
      <ErrorNotice error={error} onRetry={() => revalidator.revalidate()} />
      <p className="mt-4">
        <Link to="/" className="text-sm underline">
          공식 카드 목록으로
        </Link>
      </p>
    </Page>
  );
}
