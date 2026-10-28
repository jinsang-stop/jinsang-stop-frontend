/**
 * E2E 저장 응답 — 실제 백엔드 응답 모양(Swagger 예시)과 같게 둔 고정 데이터.
 * 전사·대사·점수는 원래 `음성 서비스`·`추론 서비스`가 만드는 값이라, 여기서는
 * 턴 번호마다 정해 둔 값을 돌려준다.
 */

export const CARDS = [
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

export const INTENSITY_GUIDE = {
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
      allowedBehaviors: ["1단계의 행동을 모두 한다", "언성을 높이고 반말을 섞는다"],
      requiresConsent: true,
    },
    {
      level: 3,
      title: "3단계 · 고성과 비하",
      allowedBehaviors: ["2단계의 행동을 모두 한다", "고성으로 말을 몰아붙인다"],
      requiresConsent: true,
    },
  ],
};

export const USER = { userId: 1, loginId: "trainee01", displayName: "김알바" };

/** 턴 번호(1부터)별 저장 응답. 3턴에서 민원인이 진정한다. */
export const TURNS = [
  {
    userTranscript: "불편을 드려 죄송합니다 손님, 어떤 점이 문제였는지 말씀해 주시겠어요?",
    complainantLine: "어제 산 도시락이 상했어요. 당장 현금으로 환불해 주세요.",
    calmed: false,
    scores: [
      [4, "차분한 말투로 응대를 시작했다."],
      [3, "불편했던 점을 먼저 물었다."],
      [3, "거절할 요구가 아직 없었다."],
    ],
  },
  {
    userTranscript: "놀라셨겠어요. 다만 영수증이 없으면 현금 환불은 어렵습니다.",
    complainantLine: "영수증이 뭐가 중요해요? 내가 여기서 샀다니까요!",
    calmed: false,
    scores: [
      [4, "몰아붙이는 말에도 어조를 유지했다."],
      [4, "놀랐을 감정을 말로 받아 주었다."],
      [4, "환불이 어렵다는 점을 돌려 말하지 않았다."],
    ],
  },
  {
    userTranscript: "대신 결제 내역을 같이 찾아보거나 같은 상품으로 교환해 드릴게요.",
    complainantLine: "……알겠어요. 그럼 결제 내역부터 찾아봐 줘요.",
    calmed: true,
    scores: [
      [5, "끝까지 차분했다."],
      [4, "대안을 제시하며 감정을 존중했다."],
      [4, "기준을 지키며 대안을 냈다."],
    ],
  },
] as const;

/** 0.2초 무음 WAV(8kHz · 8bit · 모노). */
export function silentWavBase64(): string {
  const samples = 1600;
  const buffer = Buffer.alloc(44 + samples, 128);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(8000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples, 40);
  return buffer.toString("base64");
}
