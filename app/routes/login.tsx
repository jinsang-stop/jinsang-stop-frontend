import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import type { Route } from "./+types/login";
import { login } from "~/auth/api";
import { ErrorNotice } from "~/components/ErrorNotice";
import { Page } from "~/components/Page";

export function meta(_: Route.MetaArgs) {
  return [{ title: "로그인 — 진상 멈춰" }];
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  /** 로그인 화면으로 밀려나기 전에 가려던 곳. 없으면 목록으로 보낸다. */
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ loginId, password });
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page title="로그인" description="내 계정으로 훈련 기록을 쌓습니다.">
      <form onSubmit={submit} className="max-w-sm space-y-4">
        <div>
          <label
            htmlFor="loginId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            아이디
          </label>
          <input
            id="loginId"
            name="loginId"
            autoComplete="username"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        {error != null && <ErrorNotice error={error} />}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          {submitting ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </Page>
  );
}
