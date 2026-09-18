import { Link, Outlet, redirect, useNavigate } from "react-router";

import type { Route } from "./+types/protected";
import { ApiError } from "~/api/errors";
import { fetchCurrentUser, logout } from "~/auth/api";
import { Page } from "~/components/Page";

/**
 * 로그인해야 볼 수 있는 화면들의 바깥 틀.
 *
 * 미인증이면 로그인 화면으로 보낸다 — 가려던 곳을 `redirectTo`로 넘겨
 * 로그인 후 그대로 이어가게 한다.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    return { user: await fetchCurrentUser() };
  } catch (error) {
    // 실제 호출의 401은 apiFetch가 이미 redirect로 바꾼다. 여기 남은 것은
    // 백엔드 없이 도는 목업 경로다 — 백엔드가 열리면 이 분기도 함께 지운다.
    if (error instanceof ApiError && error.status === 401) {
      const { pathname, search } = new URL(request.url);
      throw redirect(
        `/login?redirectTo=${encodeURIComponent(`${pathname}${search}`)}`,
      );
    }
    throw error;
  }
}

export function HydrateFallback() {
  return <Page title="진상 멈춰">불러오는 중…</Page>;
}

export default function Protected({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="font-semibold text-gray-900 dark:text-gray-50"
          >
            진상 멈춰
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              {user.name}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </>
  );
}
