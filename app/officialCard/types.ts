/**
 * `공식 카드` · `강도` 관련 타입.
 *
 * 용어 대응 (jinsang-stop/CONTEXT.md → 코드):
 * | 용어 | 식별자 |
 * |---|---|
 * | 시나리오 카드 | `ScenarioCard` |
 * | 공식 카드 | `OfficialCard` |
 * | 민원인 | `complainant` |
 * | 화면 표시 역할명 | `complainantRoleName` |
 * | 상황 설정 | `situation` |
 * | 하드 턴 상한 | `hardTurnLimit` |
 * | 강도 | `intensity` |
 *
 * 필드 모양은 백엔드 응답(jinsang-stop-backend `GET /api/cards` ·
 * `GET /api/intensities`)과 같다.
 *
 * 이 파일에 **진정 조건과 양보 불가선 필드를 두지 않는다.** 백엔드 응답 DTO에도
 * 없다 — 프론트가 그걸 알면 사용자가 정답을 보고 연기하게 된다(PRD-v2 모듈 경계).
 */

/** `강도` — 1~3단계(ADR-0005). 기본값은 백엔드가 `defaultLevel`로 내려준다. */
export type Intensity = 1 | 2 | 3;

export const INTENSITIES: readonly Intensity[] = [1, 2, 3];

/** `공식 카드` — 목록과 상세가 같은 모양이다. */
export type OfficialCard = {
  /** 카드 식별자. 상세 조회와 세션 시작 요청에 그대로 쓴다. */
  cardId: number;
  /** 카드 이름. */
  name: string;
  /** 상황 설정. */
  situation: string;
  /** `민원인`을 화면에 표시할 역할명(손님 등). */
  complainantRoleName: string;
  /** `하드 턴 상한` — 이 턴 수에 닿으면 진정시키지 못한 채 종료된다. */
  hardTurnLimit: number;
};

/**
 * `강도` 한 단계의 고지 — 그 단계에서 `민원인`이 할 수 있는 행동.
 * 문구는 백엔드가 내려준다. 프론트가 자체 문구를 갖지 않는다.
 */
export type IntensityLevel = {
  level: Intensity;
  /** 단계 이름. 예: `2단계 · 언성과 비꼬기` */
  title: string;
  /** 이 단계에서 `민원인`이 할 수 있는 행동. 여기 없는 행동은 하지 않는다. */
  allowedBehaviors: string[];
  /** 시작 전에 고지 확인을 받아야 하는가. 2단계 이상이 true다(ADR-0005). */
  requiresConsent: boolean;
};

/** 강도 선택 화면에 필요한 고지 정보 전체. */
export type IntensityGuide = {
  /** 강도 선택의 초기값. 프론트에 숫자를 박지 않고 이 값을 쓴다. */
  defaultLevel: Intensity;
  /** 모든 단계 공통 안내 — 절대선과 즉시 중단 가능 여부. */
  commonNotice: string;
  /** 1단계부터 오름차순. */
  levels: IntensityLevel[];
};

/** 해당 단계의 고지를 찾는다. 계약상 세 단계가 모두 내려오지만 방어적으로 다룬다. */
export function findLevel(
  guide: IntensityGuide,
  intensity: Intensity,
): IntensityLevel | undefined {
  return guide.levels.find((it) => it.level === intensity);
}
