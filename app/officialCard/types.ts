/**
 * `공식 카드` 관련 타입.
 *
 * 용어 대응 (jinsang-stop/CONTEXT.md → 코드):
 * | 용어 | 식별자 |
 * |---|---|
 * | 시나리오 카드 | `ScenarioCard` |
 * | 공식 카드 | `OfficialCard` |
 * | 민원인 | `complainant` |
 * | 화면 표시 역할명 | `displayRole` |
 * | 상황 설정 | `situation` |
 * | 하드 턴 상한 | `hardTurnLimit` |
 * | 강도 | `intensity` |
 *
 * 이 파일에 **진정 조건과 양보 불가선 필드를 두지 않는다.** 백엔드 응답 DTO에도
 * 없다 — 프론트가 그걸 알면 사용자가 정답을 보고 연기하게 된다(PRD-v2 모듈 경계).
 */

/** `강도` — 1~3단계. 기본값은 가장 낮은 1단계다(ADR-0005). */
export type Intensity = 1 | 2 | 3;

export const INTENSITIES: readonly Intensity[] = [1, 2, 3];
export const DEFAULT_INTENSITY: Intensity = 1;

/**
 * 목록과 상세에 공통으로 내려오는 `공식 카드` 요약.
 * 슬라이스 jinsang-stop/jinsang-stop#2의 「공통 계약」이 정본이다.
 */
export type OfficialCardSummary = {
  /** 카드 식별자. */
  id: string;
  /** 카드 이름. */
  name: string;
  /** 상황 설정. */
  situation: string;
  /** `민원인`을 화면에 표시할 역할명(손님 등). */
  complainantDisplayRole: string;
  /** `하드 턴 상한` — 이 턴 수에 닿으면 진정시키지 못한 채 종료된다. */
  hardTurnLimit: number;
};

/**
 * `강도` 한 단계의 고지 — 그 단계에서 `민원인`이 할 수 있는 행동.
 * 문구는 백엔드가 내려준다. 프론트가 자체 문구를 갖지 않는다.
 */
export type IntensityNotice = {
  intensity: Intensity;
  /** 그 단계에서 `민원인`에게 허용된 행동을 사용자에게 알리는 문구. */
  notice: string;
  /** 시작 전에 고지 확인을 받아야 하는가. 2단계 이상이 true다(ADR-0005). */
  acknowledgementRequired: boolean;
};

/** 카드 상세 — 요약에 단계별 고지가 붙은 것. */
export type OfficialCardDetail = OfficialCardSummary & {
  intensityNotices: IntensityNotice[];
};

/** 해당 단계의 고지를 찾는다. 계약상 세 단계가 모두 내려오지만 방어적으로 다룬다. */
export function findNotice(
  detail: OfficialCardDetail,
  intensity: Intensity,
): IntensityNotice | undefined {
  return detail.intensityNotices.find((it) => it.intensity === intensity);
}
