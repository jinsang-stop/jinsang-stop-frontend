import { ApiError } from "~/api/errors";
import { UNAUTHENTICATED_CODE } from "./types";
import type { CurrentUser, LoginRequest, SignupRequest } from "./types";

/**
 * 백엔드 없이 화면을 보기 위한 임시 구현. `VITE_USE_MOCK_API=true`일 때만 쓰인다.
 *
 * 세션 쿠키를 흉내 내야 "새로고침해도 로그인 유지"를 화면에서 확인할 수 있어
 * `sessionStorage`에 둔다. 실제 구현에서 프론트는 아무것도 저장하지 않는다 —
 * 세션은 백엔드의 HttpOnly 쿠키에만 있다.
 */
const STORAGE_KEY = "jinsang-stop:mock-session";

/** 목업은 아무 비밀번호나 받되 비어 있으면 거절한다. */
export function mockLogin({ loginId, password }: LoginRequest): CurrentUser {
  if (loginId.trim() === "" || password === "") {
    throw new ApiError(400, "INVALID_REQUEST", "아이디와 비밀번호를 입력해 주세요.");
  }
  return remember({ userId: 1, loginId, displayName: loginId });
}

export function mockSignup({
  loginId,
  password,
  displayName,
}: SignupRequest): CurrentUser {
  if (!/^[a-z0-9_]{4,20}$/.test(loginId)) {
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      "아이디는 영문 소문자·숫자·밑줄(_) 4~20자입니다.",
    );
  }
  if (password.length < 8) {
    throw new ApiError(400, "INVALID_REQUEST", "비밀번호는 8~64자입니다.");
  }
  if (displayName.trim() === "") {
    throw new ApiError(400, "INVALID_REQUEST", "이름을 입력해 주세요.");
  }
  return remember({ userId: 1, loginId, displayName });
}

export function mockLogout(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function mockCurrentUser(): CurrentUser {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    throw new ApiError(401, UNAUTHENTICATED_CODE, "로그인이 필요합니다.");
  }
  return JSON.parse(raw) as CurrentUser;
}

function remember(user: CurrentUser): CurrentUser {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}
