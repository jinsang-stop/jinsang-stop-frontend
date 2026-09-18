import { ApiError, NETWORK_ERROR_CODE, UNKNOWN_ERROR_CODE } from "./errors";
import type { ApiErrorBody } from "./errors";

/**
 * Spring 백엔드 주소. 브라우저는 이 백엔드하고만 통신한다 —
 * `음성 서비스`·`추론 서비스`를 프론트에서 직접 부르지 않는다.
 */
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

/**
 * 백엔드 JSON API 호출 한 곳.
 *
 * 성공하면 파싱된 본문을, 실패하면 언제나 {@link ApiError}를 던진다. 화면은
 * 상태 코드나 `fetch` 예외를 직접 다루지 않는다.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      NETWORK_ERROR_CODE,
      "서버에 연결하지 못했습니다.",
    );
  }

  if (!response.ok) {
    throw new ApiError(response.status, ...(await readErrorBody(response)));
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** 오류 응답 본문에서 코드와 메시지를 꺼낸다. 형식이 어긋나도 던지지 않는다. */
async function readErrorBody(response: Response): Promise<[string, string]> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body && typeof body.code === "string" && typeof body.message === "string") {
      return [body.code, body.message];
    }
  } catch {
    // 오류 응답이 JSON이 아닌 경우(프록시 오류 페이지 등) — 아래 기본값으로 떨어진다.
  }
  return [UNKNOWN_ERROR_CODE, "요청을 처리하지 못했습니다."];
}
