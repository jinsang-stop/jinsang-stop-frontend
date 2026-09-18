import { useState } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";

import type { Route } from "./+types/cardDetail";
import { ErrorNotice } from "~/components/ErrorNotice";
import { Page } from "~/components/Page";
import { fetchOfficialCard } from "~/officialCard/api";
import { IntensityNoticeDialog } from "~/officialCard/IntensityNoticeDialog";
import { IntensityPicker } from "~/officialCard/IntensityPicker";
import { DEFAULT_INTENSITY, findNotice } from "~/officialCard/types";
import type { Intensity } from "~/officialCard/types";

export function meta(_: Route.MetaArgs) {
  return [{ title: "카드 — 진상 멈춰" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return { card: await fetchOfficialCard(params.cardId) };
}

export function HydrateFallback() {
  return <Page title="카드">불러오는 중…</Page>;
}

export default function CardDetail({ loaderData }: Route.ComponentProps) {
  const { card } = loaderData;
  const navigate = useNavigate();

  const [intensity, setIntensity] = useState<Intensity>(DEFAULT_INTENSITY);
  /** 고지 확인을 마친 단계. 단계를 바꾸면 확인은 무효가 된다. */
  const [acknowledged, setAcknowledged] = useState<Intensity | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const notice = findNotice(card, intensity);
  const needsAcknowledgement =
    notice?.acknowledgementRequired === true && acknowledged !== intensity;

  function selectIntensity(next: Intensity) {
    setIntensity(next);
    setAcknowledged(null);
  }

  function start() {
    if (needsAcknowledgement) {
      setNoticeOpen(true);
      return;
    }
    navigate(`/cards/${card.id}/session?intensity=${intensity}`);
  }

  return (
    <Page title={card.name} description={card.situation}>
      <Link
        to="/"
        className="text-sm text-gray-600 underline dark:text-gray-400"
      >
        ← 공식 카드 목록
      </Link>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-5 text-sm dark:border-gray-800">
        <div>
          <dt className="text-gray-500">상대</dt>
          <dd className="mt-1 font-medium text-gray-900 dark:text-gray-50">
            {card.complainantDisplayRole}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">최대 발화 턴</dt>
          <dd className="mt-1 font-medium text-gray-900 dark:text-gray-50">
            {card.hardTurnLimit}턴
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <IntensityPicker
          notices={card.intensityNotices}
          selected={intensity}
          onSelect={selectIntensity}
        />
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={start}
          className="rounded-md bg-gray-900 px-5 py-2.5 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          훈련 시작
        </button>
        {needsAcknowledgement && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {intensity}단계는 시작 전 고지 확인이 필요합니다.
          </p>
        )}
      </div>

      {noticeOpen && notice && (
        <IntensityNoticeDialog
          notice={notice}
          onCancel={() => setNoticeOpen(false)}
          onAcknowledge={() => {
            setAcknowledged(intensity);
            setNoticeOpen(false);
            navigate(`/cards/${card.id}/session?intensity=${intensity}`);
          }}
        />
      )}
    </Page>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const revalidator = useRevalidator();
  return (
    <Page title="카드">
      <ErrorNotice error={error} onRetry={() => revalidator.revalidate()} />
      <p className="mt-4">
        <Link to="/" className="text-sm underline">
          공식 카드 목록으로
        </Link>
      </p>
    </Page>
  );
}
