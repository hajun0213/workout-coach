import { summarizeTrend, type TrendPoint } from "@/lib/trend";
import type { Workout } from "@/types/workout";

// 강도·컨디션 추이 — 최근 12주 평균을 선 그래프로 보여 준다. 별도 그래프 도구 없이 SVG로 그린다.
// 기록이 없는 주는 선을 끊어서 "없는 값"을 있는 것처럼 잇지 않는다.

const W = 600;
const H = 180;
const PAD = { left: 28, right: 12, top: 12, bottom: 26 };

function x(index: number, total: number): number {
  return PAD.left + (index / Math.max(1, total - 1)) * (W - PAD.left - PAD.right);
}
function y(value: number): number {
  // 1(아래) ~ 5(위)
  return PAD.top + ((5 - value) / 4) * (H - PAD.top - PAD.bottom);
}

/** 값이 있는 주끼리 이어지는 구간마다 선 하나(path)로 만든다. */
function segments(
  points: TrendPoint[],
  pick: (point: TrendPoint) => number | null,
): string[] {
  const result: string[] = [];
  let current = "";
  points.forEach((point, index) => {
    const value = pick(point);
    if (value === null) {
      if (current) result.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(index, points.length).toFixed(1)} ${y(value).toFixed(1)}`;
  });
  if (current) result.push(current);
  return result;
}

function Line({
  points,
  pick,
  className,
}: {
  points: TrendPoint[];
  pick: (point: TrendPoint) => number | null;
  className: string;
}) {
  return (
    <>
      {segments(points, pick).map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        />
      ))}
      {points.map((point, index) => {
        const value = pick(point);
        return value === null ? null : (
          <circle
            key={point.weeksAgo}
            cx={x(index, points.length)}
            cy={y(value)}
            r={3.5}
            className={`${className} fill-surface`}
            strokeWidth={2}
          >
            <title>{`${point.startLabel} 주 · ${value}`}</title>
          </circle>
        );
      })}
    </>
  );
}

export default function TrendCard({ records }: { records: Workout[] }) {
  const points = summarizeTrend(records);
  const withData = points.filter((p) => p.count > 0);
  if (withData.length === 0) return null;

  const last = [...withData].pop()!;
  const first = withData[0];
  const diff = (a: number | null, b: number | null) =>
    a !== null && b !== null ? Math.round((b - a) * 10) / 10 : null;
  const intensityDiff = diff(first.intensity, last.intensity);
  const conditionDiff = diff(first.condition, last.condition);
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <section
      aria-label="강도·컨디션 추이"
      className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 sm:p-6 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          강도·컨디션 추이
        </h2>
        <p className="flex items-center gap-4 text-sm text-ink/60">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-cobalt" />
            강도
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-leaf" />
            컨디션
          </span>
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`최근 12주 평균 강도와 컨디션 변화. 가장 최근 주 평균 강도 ${last.intensity}, 컨디션 ${last.condition}`}
        className="mt-4 h-auto w-full"
      >
        {[1, 2, 3, 4, 5].map((level) => (
          <g key={level}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(level)}
              y2={y(level)}
              className="stroke-ink/10"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(level) + 4}
              textAnchor="end"
              className="fill-ink/40"
              fontSize={11}
            >
              {level}
            </text>
          </g>
        ))}
        {points.map((point, index) =>
          index % 2 === points.length % 2 || point.weeksAgo === 0 ? (
            <text
              key={point.weeksAgo}
              x={x(index, points.length)}
              y={H - 6}
              textAnchor="middle"
              className="fill-ink/40"
              fontSize={10}
            >
              {point.startLabel}
            </text>
          ) : null,
        )}
        <Line points={points} pick={(p) => p.condition} className="stroke-leaf" />
        <Line points={points} pick={(p) => p.intensity} className="stroke-cobalt" />
      </svg>

      <p className="mt-3 text-sm text-ink/70">
        기록이 있는 첫 주 대비 최근 주는 강도{" "}
        <span className="font-semibold text-ink">
          {intensityDiff === null || withData.length < 2
            ? "-"
            : sign(intensityDiff)}
        </span>
        , 컨디션{" "}
        <span className="font-semibold text-ink">
          {conditionDiff === null || withData.length < 2
            ? "-"
            : sign(conditionDiff)}
        </span>
        이에요.
      </p>
      <p className="mt-2 text-xs text-ink/40">
        최근 12주, 월요일부터 한 주의 평균이에요. 기록이 없는 주는 선이 끊겨요.
      </p>
    </section>
  );
}
