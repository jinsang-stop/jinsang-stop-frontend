import { apiFetch } from "~/api/client";
import { mockCurrentUser, mockLogin, mockLogout, mockSignup } from "./mock";
import type { CurrentUser, LoginRequest, SignupRequest } from "./types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/**
 * 현재 로그인한 사용자. 미인증(401)이면 로그인 화면으로 보내는 redirect를 던진다.
 * 세션 쿠키로 식별하므로 프론트가 따로 붙여 보내는 것은 없다.
 */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  if (USE_MOCK) {
    return mockCurrentUser();
  }
  return apiFetch<CurrentUser>("/api/auth/me");
}

export async function login(request: LoginRequest): Promise<CurrentUser> {
  if (USE_MOCK) {
    return mockLogin(request);
  }
  return apiFetch<CurrentUser>(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    // 자격 증명이 틀린 401을 로그인 화면에서 그대로 보여준다.
    { redirectOnUnauthenticated: false },
  );
}

/** 회원가입 — 성공하면 바로 로그인 상태가 된다(응답에 세션 쿠키가 실린다). */
export async function signup(request: SignupRequest): Promise<CurrentUser> {
  if (USE_MOCK) {
    return mockSignup(request);
  }
  return apiFetch<CurrentUser>(
    "/api/auth/signup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    { redirectOnUnauthenticated: false },
  );
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    mockLogout();
    return;
  }
  await apiFetch<void>("/api/auth/logout", { method: "POST" });
}
