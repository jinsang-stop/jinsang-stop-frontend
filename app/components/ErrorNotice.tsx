import { toUserMessage } from "~/api/errors";

/**
 * 오류 하나를 화면에 띄우는 공통 표시.
 * 문구는 백엔드가 내려준 사용자 표시용 메시지를 그대로 쓴다.
 */
export function ErrorNotice({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
    >
      <p>{toUserMessage(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-red-400 px-3 py-1.5 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
