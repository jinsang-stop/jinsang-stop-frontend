import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "requesting" | "recording";

/**
 * 마이크를 열지 못한 이유.
 * - `denied`: 사용자가 권한을 거부했다.
 * - `unavailable`: 마이크가 없거나, 브라우저가 녹음을 지원하지 않거나, 다른 앱이 쓰고 있다.
 */
export type RecorderError = "denied" | "unavailable";

/**
 * 마이크로 `발화 턴` 한 덩어리를 녹음한다.
 *
 * 턴은 언제나 사용자가 닫는다(ADR-0001) — 자동 발화 종료 감지는 하지 않고
 * `stop()`이 불릴 때까지 녹음한다. 턴마다 마이크를 열고 닫아, 말하지 않는 동안은
 * 브라우저의 녹음 표시가 꺼져 있게 한다.
 */
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (status !== "recording") {
      return;
    }
    const timer = setInterval(
      () => setElapsedMs(Date.now() - startedAtRef.current),
      200,
    );
    return () => clearInterval(timer);
  }, [status]);

  // 화면을 떠나면 마이크를 반드시 닫는다.
  useEffect(() => () => releaseStream(recorderRef.current), []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("unavailable");
      return false;
    }

    setStatus("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      setStatus("idle");
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "denied"
          : "unavailable",
      );
      return false;
    }

    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setStatus("recording");
    return true;
  }, []);

  /** 녹음을 닫고 오디오를 돌려준다. 녹음 중이 아니면 `null`. */
  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      recorder.onstop = () => {
        releaseStream(recorder);
        recorderRef.current = null;
        setStatus("idle");
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
        chunksRef.current = [];
      };
      recorder.stop();
    });
  }, []);

  return { status, error, elapsedMs, start, stop };
}

function releaseStream(recorder: MediaRecorder | null) {
  recorder?.stream.getTracks().forEach((track) => track.stop());
}
