import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 대표 여정(#8). 화면은 실제 API 호출 경로(`VITE_USE_MOCK_API=false`)로 띄우고,
 * 백엔드 응답은 `e2e/fakeBackend.ts`가 저장 응답으로 대신한다 — `음성 서비스`·
 * `추론 서비스`를 띄우지 않고도 같은 여정을 매번 똑같이 재현하기 위함이다.
 *
 * 브라우저는 기본으로 Playwright의 Chromium을 쓴다. 설치된 Chrome을 쓰려면
 * `PW_CHANNEL=chrome npm run test:e2e`.
 */
const PORT = 5175;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    permissions: ["microphone"],
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PW_CHANNEL || undefined,
        launchOptions: {
          // 실제 마이크 대신 가짜 장치, 권한 창 없이 허용, 자동 재생 허용.
          args: [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npx react-router dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_USE_MOCK_API: "false",
      VITE_API_BASE_URL: "http://localhost:8080",
    },
  },
});
