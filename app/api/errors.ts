/**
 * 백엔드 공통 오류 응답.
 *
 * 슬라이스 jinsang-stop/jinsang-stop#2에서 정한 형식 — 상태 코드 + 오류 코드 +
 * 사용자 표시용 메시지. 이후 슬라이스도 이 형식을 그대로 쓴다.
 */
export type ApiErrorBody = {
  /** 화면 분기에 쓰는 기계용 코드. 예: `CARD_NOT_FOUND` */
  code: string;
  /** 그대로 사용자에게 보여줘도 되는 한국어 메시지. */
  message: string;
};

/** 오류 코드가 없거나 응답을 읽지 못했을 때 쓰는 코드. */
export const UNKNOWN_ERROR_CODE = "UNKNOWN";
/** 백엔드에 닿지 못했을 때(오프라인, 서버 미기동, CORS 차단) 쓰는 코드. */
export const NETWORK_ERROR_CODE = "NETWORK_ERROR";

export class ApiError extends Error {
  /** 백엔드에 닿지 못한 경우 0. */
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  /** 백엔드에 닿지 못해 만들어진 오류인가. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/**
 * 어떤 오류든 화면에 그대로 띄울 수 있는 한 문장으로 바꾼다.
 *
 * 백엔드가 내려준 메시지가 있으면 그것을 쓴다 — 사용자 표시용으로 이미 다듬어진
 * 문장이고, 프론트가 코드별 문구를 따로 갖고 있으면 두 곳이 어긋난다.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    }
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
