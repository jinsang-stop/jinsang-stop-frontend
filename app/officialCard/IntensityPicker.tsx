import type { Intensity, IntensityGuide } from "./types";

/**
 * `강도` 선택. 단계는 난이도가 아니라 `민원인`이 얼마나 심하게 구는지를
 * 뜻한다(CONTEXT.md). 단계 이름·허용 행동·공통 안내는 백엔드 문구를 쓴다.
 */
export function IntensityPicker({
  guide,
  selected,
  onSelect,
}: {
  guide: IntensityGuide;
  selected: Intensity;
  onSelect: (intensity: Intensity) => void;
}) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        강도 선택
      </legend>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        민원인이 얼마나 심하게 구는지를 고릅니다. 감당할 수 있는 단계에서
        연습하세요.
      </p>
      <div className="mt-4 space-y-3">
        {guide.levels.map((level) => {
          const isSelected = selected === level.level;
          return (
            <label
              key={level.level}
              className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${
                isSelected
                  ? "border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-900"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <input
                type="radio"
                name="intensity"
                value={level.level}
                checked={isSelected}
                onChange={() => onSelect(level.level)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-gray-50">
                  {level.title}
                  {level.level === guide.defaultLevel && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      기본
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
                  {level.allowedBehaviors.join(" · ")}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {guide.commonNotice}
      </p>
    </fieldset>
  );
}
