import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/cards.tsx"),
  route("cards/:cardId", "routes/cardDetail.tsx"),
  route("cards/:cardId/session", "routes/session.tsx"),
] satisfies RouteConfig;
