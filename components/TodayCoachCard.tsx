"use client";

import { useState, useSyncExternalStore } from "react";
import { getGoalSnapshot, subscribeGoal } from "@/lib/goal";
import { normalizeParse, type QuickFill } from "@/lib/quick-input";
import { assessRecovery, type RecoveryLevel } from "@/lib/recovery";
import {
  dateKey,
  getRestSnapshot,
  subscribeRest,
  toggleRestDay,
} from "@/lib/rest";
import {
  getRoutinesSnapshot,
  routinesForToday,
  subscribeRoutines,
  type Routine,
} from "@/lib/routines";
import { addSampleRecords } from "@/lib/sample";
import { sportIcon } from "@/lib/sport-icons";
import { DEFAULT_WEEKLY_GOAL, thisWeekCount } from "@/lib/stats";
import { getRecordsSnapshot, subscribeRecords } from "@/lib/storage";
import { planForToday } from "@/lib/today";
import { getReportSnapshot, subscribeReport } from "@/lib/weekly-report";
import type { Workout } from "@/types/workout";

// 오늘의 코치 — 홈 맨 위 카드. 기록이 없으면 서비스 소개와 "샘플로 체험하기", 있으면 오늘의 회복 상태·이번 주 목표·
// 오늘의 계획(주간 리포트)·오늘의 루틴을 한 곳에 모아 보여 주고, 버튼 하나로 아래 입력 칸을 미리 채운다.
const DOT: Record<RecoveryLevel, string> = {
  good: "bg-leaf",
  caution: "bg-accent",
  rest: "bg-red-500",
};
const EMPTY_STR: string[] = [];
const EMPTY_ROUTINES: Routine[] = [];

export default function TodayCoachCard({
  onApply,
}: {
  onApply: (fill: QuickFill) => void;
}) {
  const records = useSyncExternalStore<Workout[] | null>(
    subscribeRecords,
    getRecordsSnapshot,
    () => null,
  );
  const restDays = useSyncExternalStore(
    subscribeRest,
    getRestSnapshot,
    () => EMPTY_STR,
  );
  const routines = useSyncExternalStore(
    subscribeRoutines,
    getRoutinesSnapshot,
    () => EMPTY_ROUTINES,
  );
  const report = useSyncExternalStore(
    subscribeReport,
    getReportSnapshot,
    () => null,
  );
  const goal = useSyncExternalStore(
    subscribeGoal,
    getGoalSnapshot,
    () => DEFAULT_WEEKLY_GOAL,
  );
  const [error, setError] = useState(false);

  if (records === null) return null; // 서버 화면과 어긋나지 않게 브라우저에서 읽은 뒤에 보여 준다.

  // ── 처음 오신 분: 소개 + 샘플 체험 ──
  if (records.length === 0 && routines.length === 0) {
    return (
      <section
        aria-label="서비스 소개"
        className="rounded-2xl bg-ink/5 p-5 sm:p-6"
      >
        <p className="text-base font-semibold tracking-tight">
          운동 전 · 후 · 한 주를 AI가 이어서 코칭해요
        </p>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink/70">
          <li>
            <b className="text-ink">운동 전</b> — 오늘 컨디션으로 오늘의 운동을
            추천받아요.
          </li>
          <li>
            <b className="text-ink">운동 후</b> — 한 줄로 기록하면 피드백과 다음
            운동 계획을 줘요.
          </li>
          <li>
            <b className="text-ink">한 주</b> — 주간 리포트로 돌아보고, 다음 주
            계획을 짜요.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => addSampleRecords()}
            className="btn-chip h-11 rounded-xl px-5 text-sm font-medium"
          >
            샘플 기록으로 체험하기
          </button>
          <p className="text-xs text-ink/60">
            12주치 예시 기록이 채워져요. 언제든 지울 수 있어요.
          </p>
        </div>
      </section>
    );
  }

  const now = new Date();
  const restToday = restDays.includes(dateKey(now));
  const recovery = assessRecovery(records, now, restToday);
  const count = thisWeekCount(records, now);
  const percent = Math.min(100, Math.round((count / goal) * 100));
  const todayPlan = planForToday(report, now);
  const todayRoutines = routinesForToday(routines, now);

  const fillFrom = (v: {
    sport: string | null;
    minutes: number;
    intensity: number | null;
  }) =>
    onApply(
      normalizeParse({
        minutes: v.minutes > 0 ? v.minutes : null,
        sport: v.sport,
        intensity: v.intensity,
        condition: null,
        pain: null,
      }),
    );

  return (
    <section
      aria-label="오늘의 코치"
      className="rounded-2xl bg-ink/5 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">오늘의 코치</h2>
        <button
          type="button"
          onClick={() => setError(!toggleRestDay())}
          aria-pressed={restToday}
          className={`h-9 rounded-xl px-3 text-sm font-medium transition-colors ${
            restToday
              ? "bg-leaf/15 text-leaf-text hover:bg-leaf/25"
              : "bg-surface/70 text-ink/80 hover:bg-surface"
          }`}
        >
          {restToday ? "😴 오늘 쉬는 날 · 취소" : "😴 오늘은 쉬었어요"}
        </button>
      </div>

      {recovery && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink/80">
          <span
            aria-hidden="true"
            className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[recovery.level]}`}
          />
          <span>
            <b>{recovery.title}</b>{" "}
            <span className="text-ink/60">— {recovery.reasons[0]}</span>
          </span>
        </p>
      )}

      <div className="mt-3">
        <p className="text-sm text-ink/60">
          이번 주 <b className="text-ink">{count}</b> / {goal}회
        </p>
        <div
          role="progressbar"
          aria-label="이번 주 목표 달성률"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(count, goal)}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/10"
        >
          <div
            style={{ width: `${percent}%` }}
            className={`h-full rounded-full ${count >= goal ? "bg-leaf" : "bg-cobalt"}`}
          />
        </div>
      </div>

      {(todayPlan || todayRoutines.length > 0) && (
        <ul className="mt-4 space-y-2">
          {todayPlan && (
            <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface/70 px-4 py-3">
              {todayPlan.plan.sport ? (
                <>
                  <p className="text-sm">
                    <span className="text-xs text-ink/60">
                      주간 리포트 · 오늘({todayPlan.day}) 계획
                    </span>
                    <br />
                    <b>
                      <span aria-hidden="true">
                        {sportIcon(todayPlan.plan.sport)}
                      </span>{" "}
                      {todayPlan.plan.sport} {todayPlan.plan.minutes}분 · 강도{" "}
                      {todayPlan.plan.intensity}
                    </b>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      fillFrom({
                        sport: todayPlan.plan.sport,
                        minutes: todayPlan.plan.minutes,
                        intensity: todayPlan.plan.intensity,
                      })
                    }
                    className="h-9 rounded-xl bg-chip px-4 text-sm font-medium text-white transition-colors hover:bg-chip-hover"
                  >
                    이 계획으로 기록 시작
                  </button>
                </>
              ) : (
                <p className="text-sm">
                  <span className="text-xs text-ink/60">
                    주간 리포트 · 오늘({todayPlan.day}) 계획
                  </span>
                  <br />
                  <b>😴 오늘은 휴식하는 날이에요</b>
                </p>
              )}
            </li>
          )}
          {todayRoutines.map((routine) => (
            <li
              key={routine.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface/70 px-4 py-3"
            >
              <p className="text-sm">
                <span className="text-xs text-ink/60">내 루틴</span>
                <br />
                <b>
                  <span aria-hidden="true">{sportIcon(routine.sport)}</span>{" "}
                  {routine.sport} {routine.minutes}분 · 강도 {routine.intensity}
                </b>
              </p>
              <button
                type="button"
                onClick={() => fillFrom(routine)}
                className="h-9 rounded-xl bg-chip px-4 text-sm font-medium text-white transition-colors hover:bg-chip-hover"
              >
                이 루틴으로 기록 시작
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.
        </p>
      )}
    </section>
  );
}
