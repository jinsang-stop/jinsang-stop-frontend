import type { RecorderError, RecorderStatus } from "./useRecorder";

/**
 * 말하기 조작 — 녹음 시작과 "말하기 끝내기".
 *
 * 턴은 사용자가 닫는다(ADR-0001). 응답을 기다리거나 `민원인` 음성이 재생되는
 * 동안에는 새 턴을 시작할 수 없어 버튼 대신 지금 무엇을 기다리는지 보여준다.
 */
export function SpeakControl({
  recorderStatus,
  recorderError,
  elapsedMs,
  waitingFor,
  complainantDisplayRole,
  onStart,
  onStop,
}: {
  recorderStatus: RecorderStatus;
  recorderError: RecorderError | null;
  elapsedMs: number;
  /** 새 턴을 막고 있는 것. 없으면 말할 수 있다. */
  waitingFor: "response" | "complainantSpeech" | null;
  complainantDisplayRole: string;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="space-y-3">
      {recorderError && <MicErrorNotice error={recorderError} />}

      {recorderStatus === "recording" ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-3 pl-5 dark:border-red-900 dark:bg-red-950">
          <span className="flex items-center gap-2.5 text-sm font-medium text-red-900 dark:text-red-100">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-red-600" />
            </span>
            듣고 있습니다
            <span className="tabular-nums text-red-700 dark:text-red-300">
              {formatElapsed(elapsedMs)}
            </span>
          </span>
          <button
            type="button"
            onClick={onStop}
            className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700"
          >
            말하기 끝내기
          </button>
        </div>
      ) : waitingFor ? (
        <p
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400"
          aria-live="polite"
        >
          <span className="size-2 animate-pulse rounded-full bg-gray-400" />
          {waitingFor === "response"
            ? `${complainantDisplayRole}의 응답을 기다리는 중…`
            : `${complainantDisplayRole}의 말을 듣는 중입니다. 말이 끝나면 이어서 말할 수 있습니다.`}
        </p>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={recorderStatus === "requesting"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-4 font-semibold text-white hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          <MicIcon />
          {recorderStatus === "requesting"
            ? "마이크 권한을 기다리는 중…"
            : "말하기 시작"}
        </button>
      )}
    </div>
  );
}

function MicErrorNotice({ error }: { error: RecorderError }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
    >
      {error === "denied" ? (
        <>
          <p className="font-medium">마이크 권한이 거부되었습니다.</p>
          <p className="mt-1">
            주소창 왼쪽의 사이트 설정에서 마이크를 허용한 뒤 「말하기 시작」을
            다시 눌러 주세요.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium">마이크를 사용할 수 없습니다.</p>
          <p className="mt-1">
            마이크가 연결돼 있는지, 다른 프로그램이 마이크를 쓰고 있지 않은지
            확인해 주세요.
          </p>
        </>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18v4" />
    </svg>
  );
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
