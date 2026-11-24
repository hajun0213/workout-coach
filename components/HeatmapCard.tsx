"use client";

import { useSyncExternalStore } from "react";
import { HEATMAP_WEEKS, buildHeatmap } from "@/lib/achievements";
import { getRestSnapshot, restDayNumbers, subscribeRest } from "@/lib/rest";
import type { Workout } from "@/types/workout";

// 추가 기능 — 운동 달력. 최근 12주를 한 칸이 하루인 달력으로 보여 준다. 운동한 날은 초록색, 많이 한 날일수록 진하게.
const LEVEL_CLASS = [
  "bg-ink/10",
  "bg-leaf/35",
  "bg-leaf/65",
  "bg-leaf",
] as const;
const DAY_NAMES = ["월", "", "수", "", "금", "", "일"];

function formatMinutes(total: number): string {
  if (total < 60) return `${total}분`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

const EMPTY_REST: string[] = [];

export default function HeatmapCard({ records }: { records: Workout[] }) {
  const restKeys = useSyncExternalStore(
    subscribeRest,
    getRestSnapshot,
    () => EMPTY_REST,
  );
  const columns = buildHeatmap(
    records,
    new Date(),
    HEATMAP_WEEKS,
    restDayNumbers(restKeys),
  );
  const activeDays = columns.flat().filter((cell) => cell.count > 0).length;

  return (
    <section
      aria-label="운동 달력"
      className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)] sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">운동 달력</h2>
        <p className="text-sm text-ink/60">
          최근 {HEATMAP_WEEKS}주 중{" "}
          <span className="font-semibold text-leaf-text">{activeDays}일</span>{" "}
          운동했어요
        </p>
      </div>

      <div className="mt-4 flex max-w-md gap-2">
        <div
          aria-hidden="true"
          className="grid shrink-0 grid-rows-7 gap-1 text-[10px] leading-none text-ink/60"
        >
          {DAY_NAMES.map((name, i) => (
            <span key={i} className="flex items-center">
              {name}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`최근 ${HEATMAP_WEEKS}주 운동 달력. ${activeDays}일 운동했어요.`}
          className="grid flex-1 grid-flow-col grid-rows-7 gap-1"
          style={{
            gridTemplateColumns: `repeat(${HEATMAP_WEEKS}, minmax(0, 1fr))`,
          }}
        >
          {columns.flat().map((cell) => (
            <div
              key={cell.day}
              title={
                cell.future
                  ? cell.label
                  : cell.count === 0
                    ? `${cell.label} · ${cell.rest ? "쉬는 날 체크인" : "쉬는 날"}`
                    : `${cell.label} · ${cell.count}회 · ${formatMinutes(cell.minutes)}`
              }
              className={`aspect-square rounded-[4px] ${cell.future ? "bg-transparent" : cell.rest ? "bg-cobalt/25" : LEVEL_CLASS[cell.level]}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-ink/60">
        <span
          aria-hidden="true"
          className="mr-2 inline-flex items-center gap-1"
        >
          <span className="size-3 rounded-[3px] bg-cobalt/25" /> 쉬는 날
        </span>
        적게
        {LEVEL_CLASS.map((cls) => (
          <span
            key={cls}
            aria-hidden="true"
            className={`size-3 rounded-[3px] ${cls}`}
          />
        ))}
        많이
      </div>
    </section>
  );
}
