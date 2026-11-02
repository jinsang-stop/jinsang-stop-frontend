import { useState } from "react";
import { useNavigate } from "react-router";

import type { GrowthPoint } from "./types";

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 16, right: 20, bottom: 32, left: 36 };

/**
 * 한 카드·한 `강도`의 `소요 턴 수` 꺾은선. 한 차트에는 한 강도만 그린다 —
 * 강도가 다른 점이 한 선으로 이어지지 않게 하려는 것이다(ADR-0004).
 *
 * x축은 세션 순서(종료 시각 순), y축은 소요 턴 수(0 ~ 하드 턴 상한). 점에
 * 올리면 보조 지표(축별 평균)가 보이고, 누르면 그 세션의 리포트로 간다.
 */
export function GrowthChart({
  points,
  hardTurnLimit,
  label,
}: {
  points: GrowthPoint[];
  hardTurnLimit: number;
  /** 스크린리더용 차트 이름. */
  label: string;
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<number | null>(null);

  const yMax = Math.max(hardTurnLimit, ...points.map((it) => it.turnsToCalm));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left +
    (points.length === 1 ? plotWidth / 2 : (plotWidth * index) / (points.length - 1));
  const y = (value: number) => PAD.top + plotHeight * (1 - value / yMax);
  const ticks = yTicks(yMax);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.turnsToCalm)}`)
    .join(" ");
  const active = hovered !== null ? points[hovered] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={label}
        className="w-full text-gray-900 dark:text-gray-100"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-gray-200 dark:stroke-gray-800"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-gray-500 text-[11px] tabular-nums"
            >
              {tick}
            </text>
          </g>
        ))}
        {points.map((point, index) => (
          <text
            key={point.sessionId}
            x={x(index)}
            y={HEIGHT - 10}
            textAnchor={labelAnchor(index, points.length)}
            className="fill-gray-500 text-[11px] tabular-nums"
          >
            {shortDate(point.endedAt)}
          </text>
        ))}
        {hovered !== null && (
          <line
            x1={x(hovered)}
            x2={x(hovered)}
            y1={PAD.top}
            y2={PAD.top + plotHeight}
            className="stroke-gray-300 dark:stroke-gray-700"
            strokeWidth={1}
          />
        )}
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <g
            key={point.sessionId}
            data-growth-point={point.sessionId}
            role="link"
            tabIndex={0}
            aria-label={`${shortDate(point.endedAt)} 소요 ${point.turnsToCalm}턴 — 리포트 보기`}
            className="cursor-pointer outline-none"
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
            onClick={() => navigate(`/sessions/${point.sessionId}/report`)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                navigate(`/sessions/${point.sessionId}/report`);
              }
            }}
          >
            {/* 점보다 넓은 누름 영역 */}
            <circle cx={x(index)} cy={y(point.turnsToCalm)} r={14} fill="transparent" />
            <circle
              cx={x(index)}
              cy={y(point.turnsToCalm)}
              r={hovered === index ? 6 : 4.5}
              fill="currentColor"
              className="stroke-white dark:stroke-gray-950"
              strokeWidth={2}
            />
          </g>
        ))}
      </svg>
      {active && hovered !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900"
          style={{
            left: `${(x(hovered) / WIDTH) * 100}%`,
            top: `${(y(active.turnsToCalm) / HEIGHT) * 100}%`,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          <p className="text-gray-500">{shortDate(active.endedAt)}</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-50">
            소요 {active.turnsToCalm}턴
          </p>
          <dl className="mt-2 space-y-0.5 text-gray-700 dark:text-gray-300">
            <AxisRow label="정서 안정" value={active.emotionalStability} />
            <AxisRow label="공감 인정" value={active.empathyAcknowledgement} />
            <AxisRow label="경계 설정" value={active.boundarySetting} />
          </dl>
        </div>
      )}
    </div>
  );
}

function AxisRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value.toFixed(1)}</dd>
    </div>
  );
}

/** 양 끝 라벨은 차트 밖으로 넘치지 않게 안쪽으로 붙인다. */
function labelAnchor(index: number, count: number): "start" | "middle" | "end" {
  if (count < 2) {
    return "middle";
  }
  return index === 0 ? "start" : index === count - 1 ? "end" : "middle";
}

/** 0부터 위까지 4~5칸 안팎의 정수 눈금. */
function yTicks(max: number): number[] {
  const step = Math.max(1, Math.ceil(max / 4));
  const ticks: number[] = [];
  for (let tick = 0; tick <= max; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

export function shortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
