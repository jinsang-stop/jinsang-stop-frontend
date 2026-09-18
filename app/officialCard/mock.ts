import type { OfficialCardDetail } from "./types";

/**
 * 백엔드 `공식 카드` API(jinsang-stop-backend#1)가 아직 없어서 화면을 먼저
 * 세우기 위한 임시 응답. `VITE_USE_MOCK_API=true`일 때만 쓰인다.
 *
 * 카드 문안은 검수 대상이므로 여기 있는 것은 형식 확인용이다 — 실제 카드는
 * 운영이 작성해 백엔드가 시드한다(ADR-0003). 백엔드 API가 열리면 이 파일을
 * 지운다.
 */
export const MOCK_OFFICIAL_CARDS: OfficialCardDetail[] = [
  {
    id: "refund-past-period",
    name: "환불 기한이 지난 영수증",
    situation:
      "매장 마감 30분 전, 구매한 지 두 달 된 상품을 들고 와 환불을 요구한다.",
    complainantDisplayRole: "손님",
    hardTurnLimit: 12,
    intensityNotices: [
      {
        intensity: 1,
        notice: "목소리를 높이지 않고 같은 요구를 반복합니다.",
        acknowledgementRequired: false,
      },
      {
        intensity: 2,
        notice:
          "언성을 높이고, 다른 매장과 비교하며 응대자의 일 처리를 탓하는 말을 할 수 있습니다.",
        acknowledgementRequired: true,
      },
      {
        intensity: 3,
        notice:
          "고성을 지르고, 책임자 호출과 본사 항의를 압박하며 응대자 개인을 겨냥한 모욕적인 표현을 쓸 수 있습니다.",
        acknowledgementRequired: true,
      },
    ],
  },
  {
    id: "queue-cut-in",
    name: "새치기를 지적받은 대기 줄",
    situation:
      "점심 피크 시간, 줄을 서지 않고 바로 주문하려다 제지당하자 항의한다.",
    complainantDisplayRole: "손님",
    hardTurnLimit: 10,
    intensityNotices: [
      {
        intensity: 1,
        notice: "불만을 말하지만 대화를 이어갈 수 있는 수준을 유지합니다.",
        acknowledgementRequired: false,
      },
      {
        intensity: 2,
        notice:
          "주변에 들리도록 언성을 높이고, 응대자의 태도를 문제 삼을 수 있습니다.",
        acknowledgementRequired: true,
      },
      {
        intensity: 3,
        notice:
          "고성을 지르고, 다른 손님 앞에서 응대자를 깎아내리는 표현을 쓸 수 있습니다.",
        acknowledgementRequired: true,
      },
    ],
  },
];
