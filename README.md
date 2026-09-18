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
