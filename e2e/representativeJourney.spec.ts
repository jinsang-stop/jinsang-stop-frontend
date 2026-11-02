import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { installFakeBackend } from "./fakeBackend";
import { TURNS } from "./storedResponses";

/**
 * 대표 여정(슬라이스 jinsang-stop/jinsang-stop#9):
 * 로그인 → 공식 카드 → 강도 1 → 발화 3턴 → 진정 종료 → 리포트 → 재도전 → 점 두 개.
 */
test("대표 여정 — 같은 카드 강도 1로 두 번 진정 종료하면 성장 그래프에 점 두 개", async ({
  page,
}) => {
  const backend = await installFakeBackend(page);
  // 브라우저는 Spring하고만 통신한다 — 화면 서버(5175)와 Spring(8080) 말고 이
  // 장비의 다른 포트(음성 서비스 8000, 추론 서비스 8081 등)로 가는 요청이 없어야 한다.
  const otherHosts: string[] = [];
  page.on("request", (request) => {
    const { hostname, port } = new URL(request.url());
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    if (local && !["5175", "8080"].includes(port)) {
      otherHosts.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("아이디").fill("trainee01");
  await page.getByLabel("비밀번호").fill("e2e-password");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByRole("heading", { name: "공식 카드" })).toBeVisible();
  await page.getByRole("link", { name: /영수증 없는 도시락 환불/ }).click();
  await expect(page.locator('input[name="intensity"][value="1"]')).toBeChecked();
  await page.getByRole("button", { name: "훈련 시작" }).click();

  await finishCalmSession(page);
  await page.getByRole("link", { name: "리포트 보기" }).click();
  await expect(page.getByText("진정 종료")).toBeVisible();
  await expect(page.getByText("성장 기록에 반영됐습니다")).toBeVisible();
  await expect(page.locator("[data-turn]")).toHaveCount(3);
  await expect(page.getByText(TURNS[0].userTranscript)).toBeVisible();

  await page.getByRole("link", { name: "같은 카드 재도전" }).click();
  await expect(page.locator('input[name="intensity"][value="1"]')).toBeChecked();
  await page.getByRole("button", { name: "훈련 시작" }).click();

  await finishCalmSession(page);
  await page.getByRole("link", { name: "리포트 보기" }).click();
  await page.getByRole("link", { name: "이 카드의 성장 기록" }).click();

  const intensityOne = page.locator('section[data-intensity="1"]');
  await expect(intensityOne.locator("[data-growth-point]")).toHaveCount(2);
  await expect(intensityOne.locator("svg path")).toHaveCount(1);
  await expect(page.locator('section[data-intensity="2"]')).toHaveCount(0);

  // 턴 본문은 multipart가 아니라 녹음 Blob 그대로다.
  expect(backend.submittedContentTypes).toHaveLength(6);
  for (const contentType of backend.submittedContentTypes) {
    expect(contentType).toMatch(/^audio\//);
  }
  expect(otherHosts).toEqual([]);
});

/** 말하기 시작 → 끝내기를 3턴 반복해 진정 종료 화면까지 간다. */
async function finishCalmSession(page: Page) {
  for (let turn = 1; turn <= TURNS.length; turn++) {
    await page.getByRole("button", { name: /말하기 시작/ }).click();
    await page.getByRole("button", { name: /말하기 끝내기/ }).click();
    await expect(page.getByText(TURNS[turn - 1].complainantLine)).toBeVisible();
  }
  await expect(page.locator('[data-end-reason="CALMED"]')).toBeVisible({
    timeout: 15_000,
  });
}
