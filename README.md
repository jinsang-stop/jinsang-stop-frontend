# jinsang-stop-frontend

「진상 멈춰」 프론트엔드 (React + TypeScript).

- 도메인 문서 · PRD · 슬라이스: [jinsang-stop/jinsang-stop](https://github.com/jinsang-stop/jinsang-stop)
- 작업 규약: [CONTRIBUTING.md](CONTRIBUTING.md)

## 기술 스택

React Router (SSR) + TypeScript + TailwindCSS + Vite

## 실행 방법

의존성 설치:

```bash
npm install
```

환경 변수 파일 준비 — `.env.example`를 복사해 쓴다:

```bash
cp .env.example .env
```

| 변수 | 뜻 |
|---|---|
| `VITE_API_BASE_URL` | Spring 백엔드 주소. 기본 `http://localhost:8080` |
| `VITE_USE_MOCK_API` | `true`면 백엔드 대신 임시 카드 응답을 쓴다. 백엔드가 뜨면 끈다 |

개발 서버 (HMR) 실행 — `http://localhost:5173`:

```bash
npm run dev
```

프로덕션 빌드:

```bash
npm run build
```

## 배포

Docker 이미지로 빌드·실행:

```bash
docker build -t jinsang-stop-frontend .
docker run -p 3000:3000 jinsang-stop-frontend
```

Docker 없이 배포할 경우 `npm run build` 결과물(`build/client`, `build/server`)과
`package.json`, 락 파일을 함께 배포하면 내장 Node 서버로 구동된다.

## 용어와 식별자

화면·타입·API 경로의 이름은 [jinsang-stop/jinsang-stop](https://github.com/jinsang-stop/jinsang-stop)의
`CONTEXT.md` 용어를 따른다.

| 용어 | 식별자 |
|---|---|
| 시나리오 카드 | `ScenarioCard` |
| 공식 카드 | `OfficialCard` · `/api/official-cards` |
| 민원인 | `complainant` |
| 화면 표시 역할명 | `complainantDisplayRole` |
| 상황 설정 | `situation` |
| 하드 턴 상한 | `hardTurnLimit` |
| 강도 | `intensity` |

`민원인`을 가리킬 때 코드·API·화면 문구 어디서도 `진상`을 쓰지 않는다 — 제품명에만 쓴다.
`시나리오 카드`의 진정 조건과 양보 불가선은 프론트에 내려오지 않으며 타입에도 두지 않는다.
