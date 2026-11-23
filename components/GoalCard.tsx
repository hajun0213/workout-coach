"use client";

import { useState, useSyncExternalStore } from "react";
import { getGoalSnapshot, setWeeklyGoal, subscribeGoal } from "@/lib/goal";
import { getRestSnapshot, restDayNumbers, subscribeRest } from "@/lib/rest";
import {
  DEFAULT_WEEKLY_GOAL,
  MAX_WEEKLY_GOAL,
  MIN_WEEKLY_GOAL,
  currentDayStreak,
  goalWeekStreak,
  thisWeekCount,
} from "@/lib/stats";
import type { Workout } from "@/types/workout";

// 추가 기능 — 주간 목표 달성률과 연속 기록. 목표는 1~7회에서 고르고 이 브라우저에 저장한다. (기본 3회: PRD의 주 3회 목표)
const GOAL_CHOICES = Array.from(
  { length: MAX_WEEKLY_GOAL - MIN_WEEKLY_GOAL + 1 },
  (_, i) => MIN_WEEKLY_GOAL + i,
);

const EMPTY_REST: string[] = [];

export default function GoalCard({ records }: { records: Workout[] }) {
  const goal = useSyncExternalStore(
    subscribeGoal,
    getGoalSnapshot,
    () => DEFAULT_WEEKLY_GOAL,
  );
  const [error, setError] = useState(false);
  const now = new Date();
  const count = thisWeekCount(records, now);
  const percent = Math.min(100, Math.round((count / goal) * 100));
  const restDays = useSyncExternalStore(
    subscribeRest,
    getRestSnapshot,
    () => EMPTY_REST,
  );
  const dayStreak = currentDayStreak(records, now, restDayNumbers(restDays));
  const weekStreak = goalWeekStreak(records, goal, now);
  const achieved = count >= goal;

  return (
    <section
      aria-label="주간 목표"
      className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">이번 주 목표</h2>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          주
          <select
            value={goal}
            onChange={(event) =>
              setError(!setWeeklyGoal(Number(event.target.value)))
            }
            className="h-10 rounded-xl border border-ink/10 bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {GOAL_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}회
              </option>
            ))}
          </select>
          목표
        </label>
      </div>

      <p className="mt-4 text-sm text-ink/60">
        <span className="text-2xl font-semibold tracking-tight text-ink">
          {count}
        </span>{" "}
        / {goal}회
        {achieved
          ? " · 이번 주 목표를 달성했어요!"
          : ` · ${goal - count}회 남았어요`}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(count, goal)}
        aria-label="이번 주 목표 달성률"
        className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10"
      >
        <div
          style={{ width: `${percent}%` }}
          className={`h-full rounded-full transition-[width] ${achieved ? "bg-leaf" : "bg-cobalt"}`}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-ink/5 px-3 py-1 font-medium text-ink/70">
          연속 운동 <b className="text-leaf-text">{dayStreak}</b>일
        </span>
        <span className="rounded-full bg-ink/5 px-3 py-1 font-medium text-ink/70">
          목표 달성 <b className="text-leaf-text">{weekStreak}</b>주 연속
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          목표를 저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.
        </p>
      )}
    </section>
  );
}
