import { ApiError } from "~/api/errors";
import { UNAUTHENTICATED_CODE } from "./types";
import type { CurrentUser, LoginRequest } from "./types";

/**
 * 백엔드 로그인 API(jinsang-stop-backend#2)가 아직 없어서 화면을 먼저 세우기
 * 위한 임시 구현. `VITE_USE_MOCK_API=true`일 때만 쓰인다.
 *
 * 세션 쿠키를 흉내 내야 "새로고침해도 로그인 유지"를 화면에서 확인할 수 있어
 * `sessionStorage`에 둔다. 실제 구현에서 프론트는 아무것도 저장하지 않는다 —
 * 세션은 백엔드의 HttpOnly 쿠키에만 있다. 백엔드 API가 열리면 이 파일을 지운다.
 */
const STORAGE_KEY = "jinsang-stop:mock-session";

/** 목업에서 통과시키는 계정. 아무 비밀번호나 받되 비어 있으면 거절한다. */
const MOCK_USER: CurrentUser = { id: "demo", name: "김알바" };

export function mockLogin({ loginId, password }: LoginRequest): CurrentUser {
  if (loginId.trim() === "" || password === "") {
    throw new ApiError(
      400,
      "INVALID_CREDENTIALS",
      "아이디와 비밀번호를 입력해 주세요.",
    );
  }
  const user = { ...MOCK_USER, name: loginId };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
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
