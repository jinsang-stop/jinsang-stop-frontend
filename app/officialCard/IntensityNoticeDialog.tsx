import type { IntensityLevel } from "./types";

/**
 * 2단계 이상 시작 전 고지 확인(ADR-0005).
 * 확인하지 않으면 다음으로 넘어갈 수 없다 — 취소만 가능하다.
 */
export function IntensityNoticeDialog({
  level,
  commonNotice,
  onAcknowledge,
  onCancel,
}: {
  level: IntensityLevel;
  commonNotice: string;
  onAcknowledge: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="intensity-notice-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
      >
        <h2
          id="intensity-notice-title"
          className="text-lg font-bold text-gray-900 dark:text-gray-50"
        >
          {level.title} 고지
        </h2>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          이 단계에서 민원인은 다음과 같이 행동할 수 있습니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
          {level.allowedBehaviors.map((behavior) => (
            <li key={behavior}>{behavior}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {commonNotice}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onAcknowledge}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
