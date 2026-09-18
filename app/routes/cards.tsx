import { Link, useRevalidator } from "react-router";

import type { Route } from "./+types/cards";
import { ErrorNotice } from "~/components/ErrorNotice";
import { Page } from "~/components/Page";
import { fetchOfficialCards } from "~/officialCard/api";

export function meta(_: Route.MetaArgs) {
  return [{ title: "공식 카드 — 진상 멈춰" }];
}

/**
 * 브라우저에서 직접 Spring 백엔드를 부른다 — 프론트가 백엔드하고만 통신한다는
 * 모듈 경계를 네트워크 탭에서 그대로 확인할 수 있어야 한다.
 */
export async function clientLoader() {
  return { cards: await fetchOfficialCards() };
}

export function HydrateFallback() {
  return <Page title="공식 카드">불러오는 중…</Page>;
}

export default function Cards({ loaderData }: Route.ComponentProps) {
  const { cards } = loaderData;

  return (
    <Page
      title="공식 카드"
      description="연습할 상황을 하나 고르세요."
    >
      {cards.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          아직 제공되는 카드가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                to={`/cards/${card.id}`}
                className="block rounded-lg border border-gray-200 p-5 hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600"
              >
                <h2 className="font-semibold text-gray-900 dark:text-gray-50">
                  {card.name}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {card.situation}
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  {card.complainantDisplayRole} · 최대 {card.hardTurnLimit}턴
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const revalidator = useRevalidator();
  return (
    <Page title="공식 카드">
      <ErrorNotice error={error} onRetry={() => revalidator.revalidate()} />
    </Page>
  );
}
