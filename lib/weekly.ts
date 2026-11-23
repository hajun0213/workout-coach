import type { Workout } from "@/types/workout";

// Design Ref: §3.3 (N1) — 최근 몇 주의 운동 횟수와 총 시간을 주 단위로 모은다.
// 주는 월요일에 시작하고, 날짜는 브라우저 시간대 기준 달력 날짜로 센다. (PRD: 주간 계산 기준)

export const WEEKS_SHOWN = 4;

export interface WeekSummary {
  /** 이번 주 = 0, 지난주 = 1, … */
  weeksAgo: number;
  /** 그 주 월요일의 월/일 (예: "11/17") */
  startLabel: string;
  count: number;
  minutes: number;
}

// 달력 날짜를 하루 단위 번호로 (시각은 버림). 읽을 수 없으면 NaN.
export function dayNumber(date: Date): number {
  if (Number.isNaN(date.getTime())) return NaN;
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

// 그 날이 속한 주의 월요일 번호
export function mondayOf(day: number): number {
  // 1970-01-01(번호 0)은 목요일이라 (day + 3) % 7 이 월요일=0이 된다.
  return day - (((day + 3) % 7) + 7) % 7;
}

/**
 * 최근 `weeks`주(이번 주 포함)의 요약. 오래된 주 → 이번 주 순서.
 * @param now 기준 시각 (테스트용으로 바꿀 수 있게 받는다)
 */
export function summarizeWeeks(
  records: Workout[],
  now: Date = new Date(),
  weeks: number = WEEKS_SHOWN,
): WeekSummary[] {
  const thisMonday = mondayOf(dayNumber(now));
  const result: WeekSummary[] = [];
  for (let ago = weeks - 1; ago >= 0; ago--) {
    const monday = new Date((thisMonday - ago * 7) * 86_400_000);
    result.push({
      weeksAgo: ago,
      startLabel: `${monday.getUTCMonth() + 1}/${monday.getUTCDate()}`,
      count: 0,
      minutes: 0,
    });
  }

  for (const record of records) {
    const day = dayNumber(new Date(record.date));
    if (Number.isNaN(day)) continue;
    const ago = (thisMonday - mondayOf(day)) / 7;
    const week = result.find((w) => w.weeksAgo === ago);
    if (!week) continue; // 범위 밖(더 오래됨, 또는 미래)
    week.count += 1;
    week.minutes += record.minutes;
  }
  return result;
}
