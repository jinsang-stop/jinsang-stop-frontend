/**
 * 인증 관련 타입.
 *
 * 인증 방식은 **자체 아이디·비밀번호 + 세션 쿠키**다(ADR-0010) — 백엔드가
 * HttpOnly 쿠키로 세션을 들고 있고, 프론트는 토큰을 저장하지 않는다.
 * 필드 모양은 백엔드 `/api/auth/*` 응답과 같다.
 */

/** 로그인한 사용자. */
export type CurrentUser = {
  userId: number;
  loginId: string;
  /** 화면에 표시할 이름. */
  displayName: string;
};

/** 로그인 입력. */
export type LoginRequest = {
  loginId: string;
  password: string;
};

/**
 * 회원가입 입력. 검증은 백엔드가 하고, 실패하면 어떤 값이 잘못됐는지
 * `message`에 담아 내려준다 — 그대로 보여준다.
 */
export type SignupRequest = LoginRequest & {
  displayName: string;
};

/** 미인증 요청에 백엔드가 내려주는 오류 코드. */
export const UNAUTHENTICATED_CODE = "UNAUTHORIZED";
