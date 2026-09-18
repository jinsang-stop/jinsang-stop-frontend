/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Spring 백엔드 주소. 없으면 `http://localhost:8080`. */
  readonly VITE_API_BASE_URL?: string;
  /** `"true"`면 백엔드 대신 임시 카드 응답을 쓴다. */
  readonly VITE_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
