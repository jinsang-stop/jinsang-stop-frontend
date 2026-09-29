import { useEffect, useRef } from "react";

/** 대화 기록에 쌓이는 `발화 턴` 하나 — 사용자 발화 1 : `민원인` 응답 1 (ADR-0001). */
export type TurnLogEntry = {
  turnNumber: number;
  transcript: string;
  complainantLine: string;
  /** 그 턴이 채점되지 않았는가. 점수가 아직 오지 않았으면 `false`다. */
  unscored: boolean;
};

/**
 * 대화 기록. `민원인`은 화면 역할명(손님 등)으로 표시한다.
 * 새 턴이 쌓이면 맨 아래로 스크롤한다.
 */
export function TurnLog({
  entries,
  complainantDisplayRole,
  submitting,
  speakingTurnNumber,
}: {
  entries: TurnLogEntry[];
  complainantDisplayRole: string;
  /** 턴을 제출하고 응답을 기다리는 중인가. */
  submitting: boolean;
  /** `민원인` 음성이 재생 중인 턴. */
  speakingTurnNumber: number | null;
}) {
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length, submitting]);

  if (entries.length === 0 && !submitting) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <p className="font-medium text-gray-800 dark:text-gray-200">
          대화를 시작할 준비가 됐습니다.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          「말하기 시작」을 누르고 {complainantDisplayRole}에게 먼저 말을 건네
          보세요. 다 말했으면 「말하기 끝내기」를 누릅니다.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-6 p-5" aria-live="polite">
      {entries.map((entry) => (
        <li key={entry.turnNumber} className="space-y-3">
          <TurnDivider turnNumber={entry.turnNumber} unscored={entry.unscored} />
          <Bubble speaker="나" side="right">
            {entry.transcript}
          </Bubble>
          <Bubble
            speaker={complainantDisplayRole}
            side="left"
            speaking={speakingTurnNumber === entry.turnNumber}
          >
            {entry.complainantLine}
          </Bubble>
        </li>
      ))}
      {submitting && (
        <li className="space-y-3">
          <TurnDivider turnNumber={entries.length + 1} unscored={false} />
          <Bubble speaker="나" side="right" placeholder>
            말한 내용을 옮겨 적는 중…
          </Bubble>
          <Bubble speaker={complainantDisplayRole} side="left" placeholder>
            응답을 기다리는 중…
          </Bubble>
        </li>
      )}
      <li ref={endRef} aria-hidden="true" />
    </ol>
  );
}

function TurnDivider({
  turnNumber,
  unscored,
}: {
  turnNumber: number;
  unscored: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      <span>
        {turnNumber}턴
        {unscored && (
          <span className="ml-2 text-amber-700 dark:text-amber-300">
            채점되지 않음
          </span>
        )}
      </span>
      <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

function Bubble({
  speaker,
  side,
  speaking = false,
  placeholder = false,
  children,
}: {
  speaker: string;
  side: "left" | "right";
  speaking?: boolean;
  placeholder?: boolean;
  children: React.ReactNode;
}) {
  const isRight = side === "right";
  return (
    <div className={`flex flex-col ${isRight ? "items-end" : "items-start"}`}>
      <span className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
        {speaker}
        {speaking && <SpeakingIndicator />}
      </span>
      <p
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed ${
          placeholder
            ? "animate-pulse border border-dashed border-gray-300 text-gray-500 dark:border-gray-700"
            : isRight
              ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
        } ${speaking ? "ring-2 ring-gray-400 dark:ring-gray-500" : ""}`}
      >
        {children}
      </p>
    </div>
  );
}

function SpeakingIndicator() {
  return (
    <span className="flex items-end gap-0.5" aria-label="말하는 중">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2.5 w-0.5 animate-pulse rounded-full bg-gray-500"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
