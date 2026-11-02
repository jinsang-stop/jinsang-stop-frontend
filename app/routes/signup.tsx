import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import type { Route } from "./+types/signup";
import { signup } from "~/auth/api";
import { ErrorNotice } from "~/components/ErrorNotice";
import { Page } from "~/components/Page";

export function meta(_: Route.MetaArgs) {
  return [{ title: "회원가입 — 진상 멈춰" }];
}

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900";
const labelClassName =
  "block text-sm font-medium text-gray-700 dark:text-gray-300";
const hintClassName = "mt-1 text-xs text-gray-500";

/**
 * 회원가입. 가입하면 바로 로그인 상태가 되므로 로그인 화면을 거치지 않고
 * 가려던 곳으로 보낸다. 입력 검증 문구는 백엔드 메시지를 그대로 쓴다.
 */
export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup({ loginId, password, displayName });
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page title="회원가입" description="내 계정을 만들고 바로 훈련을 시작합니다.">
      <form onSubmit={submit} className="max-w-sm space-y-4">
        <div>
          <label htmlFor="loginId" className={labelClassName}>
            아이디
          </label>
          <input
            id="loginId"
            name="loginId"
            autoComplete="username"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            className={inputClassName}
          />
          <p className={hintClassName}>영문 소문자·숫자·밑줄(_) 4~20자</p>
        </div>
        <div>
          <label htmlFor="password" className={labelClassName}>
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
          />
          <p className={hintClassName}>8~64자</p>
        </div>
        <div>
          <label htmlFor="displayName" className={labelClassName}>
            이름
          </label>
          <input
            id="displayName"
            name="displayName"
            autoComplete="nickname"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className={inputClassName}
          />
          <p className={hintClassName}>화면에 보일 이름, 20자 이하</p>
        </div>

        {error != null && <ErrorNotice error={error} />}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          {submitting ? "가입하는 중…" : "가입하기"}
        </button>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          이미 계정이 있나요?{" "}
          <Link
            to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="underline"
          >
            로그인
          </Link>
        </p>
      </form>
    </Page>
  );
}
