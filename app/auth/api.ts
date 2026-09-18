import { apiFetch } from "~/api/client";
import { mockCurrentUser, mockLogin, mockLogout } from "./mock";
import type { CurrentUser, LoginRequest } from "./types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/**
 * 현재 로그인한 사용자. 미인증이면 `UNAUTHENTICATED` 오류를 던진다.
 * 세션 쿠키로 식별하므로 프론트가 따로 붙여 보내는 것은 없다.
 */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  if (USE_MOCK) {
    return mockCurrentUser();
  }
  return apiFetch<CurrentUser>("/api/me");
}

export async function login(request: LoginRequest): Promise<CurrentUser> {
  if (USE_MOCK) {
    return mockLogin(request);
  }
  return apiFetch<CurrentUser>(
    "/api/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    // 자격 증명이 틀린 401을 로그인 화면에서 그대로 보여준다.
    { redirectOnUnauthenticated: false },
  );
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    mockLogout();
    return;
  }
  await apiFetch<void>("/api/logout", { method: "POST" });
}
