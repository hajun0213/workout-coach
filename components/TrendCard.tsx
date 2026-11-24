"use client";

import { useState } from "react";
import { summarizeTrend, type TrendPoint } from "@/lib/trend";
import type { Workout } from "@/types/workout";

// 강도·컨디션 추이 — 최근 12주 평균을 선 그래프로 보여 준다. 별도 그래프 도구 없이 SVG로 그린다.
// 기록이 없는 주는 선을 끊어서 "없는 값"을 있는 것처럼 잇지 않는다.
// 주 하나(세로 띠)에 마우스를 올리거나 누르면(휴대폰은 탭) 그 주의 세부 수치가 말풍선으로 뜬다.

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

function formatMinutes(total: number): string {
  if (total < 60) return `${total}분`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function weekName(weeksAgo: number): string {
  return weeksAgo === 0
    ? "이번 주"
    : weeksAgo === 1
      ? "지난주"
      : `${weeksAgo}주 전`;
}

/** 말풍선·화면 읽기 프로그램이 함께 쓰는 한 줄 설명 */
function describe(point: TrendPoint): string {
  const head = `${weekName(point.weeksAgo)} (${point.startLabel}~${point.endLabel})`;
  if (point.count === 0) return `${head}: 기록 없음`;
  return `${head}: 운동 ${point.count}회, ${formatMinutes(point.minutes)}, 평균 강도 ${point.intensity}, 평균 컨디션 ${point.condition}`;
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
  shown,
}: {
  points: TrendPoint[];
  pick: (point: TrendPoint) => number | null;
  className: string;
  shown: number | null;
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
            r={shown === index ? 6 : 3.5}
            className={`${className} ${shown === index ? "fill-current" : "fill-surface"} transition-[r]`}
            strokeWidth={2}
          />
        );
      })}
    </>
  );
}

function Tooltip({ point, left }: { point: TrendPoint; left: number }) {
  // 말풍선이 카드 밖으로 나가지 않게, 가리킨 주 근처에 놓되 카드 안쪽(0 ~ 카드 너비 - 말풍선 너비)으로 제한한다.
  const side = {
    left: `clamp(0px, calc(${left}% - 16px), max(0px, calc(100% - 14rem)))`,
  };
  return (
    <div
      role="tooltip"
      style={side}
      className="pointer-events-none absolute top-1 z-10 w-56 max-w-full rounded-2xl border border-ink/10 bg-surface px-3.5 py-3 text-sm shadow-[0_16px_36px_rgba(40,60,110,0.18)]"
    >
      <p className="font-semibold">
        {weekName(point.weeksAgo)}{" "}
        <span className="font-normal text-ink/60">
          {point.startLabel}~{point.endLabel}
        </span>
      </p>
      {point.count === 0 ? (
        <p className="mt-1 text-ink/60">이 주는 기록이 없어요.</p>
      ) : (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-ink/60">운동</dt>
          <dd className="whitespace-nowrap text-right font-medium">
            {point.count}회 · {formatMinutes(point.minutes)}
          </dd>
          <dt className="flex items-center gap-1.5 whitespace-nowrap text-ink/60">
            <span aria-hidden="true" className="size-2 rounded-full bg-cobalt" />
            평균 강도
          </dt>
          <dd className="text-right font-medium">{point.intensity}</dd>
          <dt className="flex items-center gap-1.5 whitespace-nowrap text-ink/60">
            <span aria-hidden="true" className="size-2 rounded-full bg-leaf" />
            평균 컨디션
          </dt>
          <dd className="text-right font-medium">{point.condition}</dd>
        </dl>
      )}
    </div>
  );
}

export default function TrendCard({ records }: { records: Workout[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const points = summarizeTrend(records);
  const withData = points.filter((p) => p.count > 0);
  if (withData.length === 0) return null;

  const shown = hover ?? pinned;
  const last = [...withData].pop()!;
  const first = withData[0];
  const diff = (a: number | null, b: number | null) =>
    a !== null && b !== null ? Math.round((b - a) * 10) / 10 : null;
  const intensityDiff = diff(first.intensity, last.intensity);
  const conditionDiff = diff(first.condition, last.condition);
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  const colPercent = (index: number) => (x(index, points.length) / W) * 100;
  const colWidth = (100 / points.length) * (W / (W - PAD.left - PAD.right)) * 0.92;

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

      <div className="relative mt-4" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`최근 12주 평균 강도와 컨디션 변화. 가장 최근 주 평균 강도 ${last.intensity}, 컨디션 ${last.condition}`}
          className="h-auto w-full"
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
                className="fill-ink/60"
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
                className={shown === index ? "fill-ink" : "fill-ink/60"}
                fontSize={10}
              >
                {point.startLabel}
              </text>
            ) : null,
          )}
          {shown !== null && (
            <line
              x1={x(shown, points.length)}
              x2={x(shown, points.length)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className="stroke-ink/25"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          )}
          <Line
            points={points}
            pick={(p) => p.condition}
            className="stroke-leaf text-leaf"
            shown={shown}
          />
          <Line
            points={points}
            pick={(p) => p.intensity}
            className="stroke-cobalt text-cobalt"
            shown={shown}
          />
        </svg>

        {/* 주마다 하나씩 겹쳐 둔 세로 띠: 마우스·터치·키보드로 그 주를 고른다. */}
        {points.map((point, index) => (
          <button
            key={point.weeksAgo}
            type="button"
            aria-label={describe(point)}
            aria-pressed={pinned === index}
            onMouseEnter={() => setHover(index)}
            onFocus={() => setHover(index)}
            onBlur={() => setHover(null)}
            onClick={() => setPinned((prev) => (prev === index ? null : index))}
            style={{
              left: `${colPercent(index)}%`,
              width: `${colWidth}%`,
            }}
            className="absolute inset-y-0 -translate-x-1/2 cursor-pointer rounded-lg outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-cobalt"
          />
        ))}

        {shown !== null && (
          <Tooltip point={points[shown]} left={colPercent(shown)} />
        )}
      </div>

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
      <p className="mt-2 text-xs text-ink/60">
        최근 12주, 월요일부터 한 주의 평균이에요. 주를 가리키거나 누르면 세부
        수치가 보여요. 기록이 없는 주는 선이 끊겨요.
      </p>
    </section>
  );
}
