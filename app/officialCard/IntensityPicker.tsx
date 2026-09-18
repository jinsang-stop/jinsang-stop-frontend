import { INTENSITIES } from "./types";
import type { Intensity, IntensityNotice } from "./types";

/**
 * `강도` 선택. 기본값은 1단계이고, 단계는 난이도가 아니라 `민원인`이 얼마나
 * 심하게 구는지를 뜻한다(CONTEXT.md).
 */
export function IntensityPicker({
  notices,
  selected,
  onSelect,
}: {
  notices: IntensityNotice[];
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
        {INTENSITIES.map((intensity) => {
          const notice = notices.find((it) => it.intensity === intensity);
          const isSelected = selected === intensity;
          return (
            <label
              key={intensity}
              className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${
                isSelected
                  ? "border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-900"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <input
                type="radio"
                name="intensity"
                value={intensity}
                checked={isSelected}
                onChange={() => onSelect(intensity)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-gray-50">
                  {intensity}단계
                  {intensity === 1 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      기본
                    </span>
                  )}
                </span>
                {notice && (
                  <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
                    {notice.notice}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
