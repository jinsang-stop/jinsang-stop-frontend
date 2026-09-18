import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  // 아래 화면들은 로그인해야 볼 수 있다.
  layout("routes/protected.tsx", [
    index("routes/cards.tsx"),
    route("cards/:cardId", "routes/cardDetail.tsx"),
    route("cards/:cardId/session", "routes/session.tsx"),
  ]),
] satisfies RouteConfig;
