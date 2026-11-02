import type { IntensityGuide, OfficialCard } from "./types";

/**
 * 백엔드 없이 화면을 보기 위한 임시 응답. `VITE_USE_MOCK_API=true`일 때만 쓰인다.
 * 모양은 백엔드 응답(`GET /api/cards` · `GET /api/intensities`)과 같게 둔다.
 *
 * 카드 문안은 검수 대상이므로 여기 있는 것은 형식 확인용이다 — 실제 카드는
 * 운영이 작성해 백엔드가 시드한다(ADR-0003).
 */
export const MOCK_OFFICIAL_CARDS: OfficialCard[] = [
  {
    cardId: 1,
    name: "영수증 없는 도시락 환불",
    situation:
      "편의점 아침 시간. 손님이 어제 산 도시락이 상했다며 영수증 없이 계산대로 와서 현금 환불을 요구한다. 결제 수단은 기억나지 않는다고 한다.",
    complainantRoleName: "손님",
    hardTurnLimit: 12,
  },
  {
    cardId: 2,
    name: "주문 실수 음료 재제조와 보상 요구",
    situation:
      "카페 점심 피크 시간. 손님이 주문한 것과 다른 음료가 나왔다며 다시 만들어 달라고 하고, 다음 방문 때 쓸 무료 음료 쿠폰까지 요구한다.",
    complainantRoleName: "손님",
    hardTurnLimit: 10,
  },
];

export const MOCK_INTENSITY_GUIDE: IntensityGuide = {
  defaultLevel: 1,
  commonNotice:
    "어느 단계에서도 성적 발언, 신체적 위협 묘사, 특정 집단에 대한 혐오 표현은 나오지 않습니다. 훈련 중 언제든 바로 중단할 수 있습니다.",
  levels: [
    {
      level: 1,
      title: "1단계 · 불만 표현",
      allowedBehaviors: [
        "불만과 요구를 분명하게 말한다",
        "같은 요구를 여러 번 되풀이한다",
        "존댓말과 평소 목소리 크기를 유지한다",
      ],
      requiresConsent: false,
    },
    {
      level: 2,
      title: "2단계 · 언성과 비꼬기",
      allowedBehaviors: [
        "1단계의 행동을 모두 한다",
        "언성을 높이고 반말을 섞는다",
        "직원의 말을 비꼬거나 무시하는 투로 말한다",
        "점장이나 책임자를 불러 달라고 요구한다",
      ],
      requiresConsent: true,
    },
    {
      level: 3,
      title: "3단계 · 고성과 비하",
      allowedBehaviors: [
        "2단계의 행동을 모두 한다",
        "고성으로 말을 몰아붙인다",
        "직원의 업무 능력과 태도를 깎아내리는 말을 한다",
        "온라인 리뷰나 본사 민원으로 문제 삼겠다고 압박한다",
      ],
      requiresConsent: true,
    },
  ],
};
