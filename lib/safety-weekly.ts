import type { z } from "zod";
import {
  BROKEN_TEXT,
  PAIN_NOTICE,
  isUsablePlan,
  truncateSentences,
} from "@/lib/safety";
import {
  WEEK_DAYS,
  type weeklyReportAiReplySchema,
  type weeklyReportRequestSchema,
} from "@/lib/schema";
import type { Level, WeeklyPlanDay, WeeklyReport } from "@/types/workout";

// 주간 리포트 안전 규칙 — AI 답을 믿지 않고 서버가 다시 적용한다. (Design §5.1, PRD §7)
export const MAX_REPORT_SUMMARY_SENTENCES = 4;
export const MAX_REPORT_TIPS = 3;
export const WEEKLY_REST_NOTICE =
  "쉬는 날이 없어서 마지막 날을 휴식으로 바꿨어요.";
export const WEEKLY_HARD_NOTICE =
  "힘든 운동이 이틀 연속이라 둘째 날 강도를 3으로 낮췄어요.";
export const WEEKLY_RISKY_NOTICE =
  "최근 컨디션이 낮거나 통증이 있어 다음 주 강도를 3 이하로 맞추고 첫 운동은 가볍게 시작하도록 했어요.";

export type WeeklyReportRequest = z.infer<typeof weeklyReportRequestSchema>;
type WeeklyAiReply = z.infer<typeof weeklyReportAiReplySchema>;

const REST_DAY = (day: WeeklyPlanDay["day"]): WeeklyPlanDay => ({
  day,
  sport: null,
  minutes: 0,
  intensity: null,
});

/**
 * 주간 리포트 답에 안전 규칙을 적용한다. 쓸 수 없는 답이면 null.
 *   · 월~일 7일이 한 번씩 있어야 한다. 운동하는 날은 종목·시간·강도가 모두 있어야 한다.
 *   · 쉬는 날이 하루도 없으면 마지막 날을 쉬는 날로 바꾼다.
 *   · 최근 2일 안에 통증이 있었거나 마지막 기록의 컨디션이 2 이하이면 모든 강도를 3 이하로, 첫 운동은 2 이하로 한다.
 *   · 강도 4 이상이 이틀 연속이면 둘째 날을 3으로 낮춘다.
 *   · 요약은 4문장, 팁은 3개까지만 남긴다.
 */
export function applyWeeklySafety(
  reply: WeeklyAiReply,
  request: WeeklyReportRequest,
): Omit<WeeklyReport, "createdAt"> | null {
  const summary = truncateSentences(
    reply.summary,
    MAX_REPORT_SUMMARY_SENTENCES,
  );
  if (!summary || BROKEN_TEXT.test(summary)) return null;
  const tips = reply.tips
    .filter((tip) => !BROKEN_TEXT.test(tip))
    .slice(0, MAX_REPORT_TIPS);

  // 7일이 월~일 한 번씩 있어야 한다.
  const byDay = new Map(reply.plan.map((entry) => [entry.day, entry]));
  if (byDay.size !== 7) return null;
  const plan: WeeklyPlanDay[] = [];
  for (const day of WEEK_DAYS) {
    const entry = byDay.get(day);
    if (!entry) return null;
    const sport = entry.sport?.trim() ?? "";
    if (sport === "" || entry.minutes === 0) {
      plan.push(REST_DAY(day));
      continue;
    }
    if (
      entry.intensity === null ||
      entry.minutes < 1 ||
      !isUsablePlan({
        sport,
        minutes: entry.minutes,
        intensity: entry.intensity,
      })
    ) {
      return null;
    }
    plan.push({
      day,
      sport,
      minutes: entry.minutes,
      intensity: entry.intensity,
    });
  }

  const notices: string[] = [];
  const cap = (day: WeeklyPlanDay, max: Level): boolean => {
    if (day.intensity !== null && day.intensity > max) {
      day.intensity = max;
      return true;
    }
    return false;
  };

  // 쉬는 날 보장
  if (plan.every((day) => day.sport !== null)) {
    plan[6] = REST_DAY("일");
    notices.push(WEEKLY_REST_NOTICE);
  }

  // 최근 상태가 좋지 않으면 전체를 가볍게
  const latest = request.records[request.records.length - 1];
  const recentPain = request.records.some((r) => r.daysAgo <= 2 && r.pain);
  const lowCondition =
    latest !== undefined && latest.daysAgo <= 2 && latest.condition <= 2;
  if (recentPain || lowCondition) {
    let changed = false;
    for (const day of plan) changed = cap(day, 3) || changed;
    const first = plan.find((day) => day.sport !== null);
    if (first) changed = cap(first, 2) || changed;
    if (changed) notices.push(WEEKLY_RISKY_NOTICE);
  }

  // 힘든 운동 이틀 연속 금지
  let hardChanged = false;
  for (let i = 1; i < plan.length; i++) {
    const prev = plan[i - 1].intensity;
    const cur = plan[i].intensity;
    if (prev !== null && prev >= 4 && cur !== null && cur >= 4) {
      hardChanged = cap(plan[i], 3) || hardChanged;
    }
  }
  if (hardChanged) notices.push(WEEKLY_HARD_NOTICE);

  if (recentPain) notices.push(PAIN_NOTICE);

  return { summary, tips, plan, notices };
}
