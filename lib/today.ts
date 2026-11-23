import { dayNumber } from "@/lib/weekly";
import { weekdayIndex } from "@/lib/routines";
import { WEEK_DAYS } from "@/lib/schema";
import type { WeeklyPlanDay, WeeklyReport } from "@/types/workout";

// 오늘의 코치 카드 — 주간 리포트의 요일별 계획에서 "오늘 할 계획"을 찾는다.
// 리포트의 계획은 월~일 요일별 틀이라, 리포트를 만든 날부터 14일 동안 같은 요일의 계획을 오늘의 계획으로 보여 준다.
export const REPORT_PLAN_VALID_DAYS = 14;

export interface TodayPlan {
  /** 오늘 요일 이름 ("월" …) */
  day: (typeof WEEK_DAYS)[number];
  plan: WeeklyPlanDay;
}

/** 오늘에 해당하는 리포트 계획. 리포트가 없거나 기간이 지났거나 오늘 요일 계획이 없으면 null. */
export function planForToday(
  report: WeeklyReport | null,
  now: Date = new Date(),
): TodayPlan | null {
  if (!report) return null;
  const created = dayNumber(new Date(report.createdAt));
  const today = dayNumber(now);
  if (Number.isNaN(created) || Number.isNaN(today)) return null;
  const age = today - created;
  if (age < 0 || age >= REPORT_PLAN_VALID_DAYS) return null;
  const day = WEEK_DAYS[weekdayIndex(now)];
  const plan = report.plan.find((entry) => entry.day === day);
  return plan ? { day, plan } : null;
}
