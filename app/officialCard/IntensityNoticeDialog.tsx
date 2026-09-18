import type { IntensityNotice } from "./types";

/**
 * 2단계 이상 시작 전 고지 확인(ADR-0005).
 * 확인하지 않으면 다음으로 넘어갈 수 없다 — 취소만 가능하다.
 */
export function IntensityNoticeDialog({
  notice,
  onAcknowledge,
  onCancel,
}: {
  notice: IntensityNotice;
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
          강도 {notice.intensity}단계 고지
        </h2>
        <p className="mt-3 text-gray-700 dark:text-gray-300">{notice.notice}</p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          훈련 중에는 언제든 한 번의 조작으로 중단할 수 있습니다.
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
