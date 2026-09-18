/**
 * 인증 관련 타입.
 *
 * 인증 방식은 **세션 쿠키**다 — 백엔드가 HttpOnly 쿠키로 세션을 들고 있고,
 * 프론트는 토큰을 저장하지 않는다. 그래서 이 파일에 토큰 타입이 없다.
 * (슬라이스 jinsang-stop/jinsang-stop#3 — 결정은 ADR로 남긴다.)
 */

/** 로그인한 사용자. 화면에 이름을 보여주는 데까지만 쓴다. */
export type CurrentUser = {
  id: string;
  /** 화면에 표시할 계정 이름. */
  name: string;
};

/** 로그인 입력. */
export type LoginRequest = {
  loginId: string;
  password: string;
};

/** 미인증 요청에 백엔드가 내려주는 오류 코드. 화면은 이걸 보고 로그인으로 보낸다. */
export const UNAUTHENTICATED_CODE = "UNAUTHENTICATED";
