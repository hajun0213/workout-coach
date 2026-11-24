import { dayNumber, mondayOf } from "@/lib/weekly";
import type { Workout } from "@/types/workout";

// 강도·컨디션 추이 — 최근 12주를 주 단위(월요일 시작)로 나눠 평균 강도와 평균 컨디션을 구한다.
// 기록이 없는 주는 값을 null로 두어 그래프에서 선이 이어지지 않게 한다.

export const TREND_WEEKS = 12;

export interface TrendPoint {
  /** 이번 주 = 0, 지난주 = 1, … */
  weeksAgo: number;
  /** 그 주 월요일의 월/일 (예: "11/17") */
  startLabel: string;
  /** 그 주 일요일의 월/일 (예: "11/23") */
  endLabel: string;
  count: number;
  /** 그 주 총 운동 시간(분) */
  minutes: number;
  /** 평균 강도(1~5, 소수 첫째 자리). 기록이 없으면 null */
  intensity: number | null;
  /** 평균 컨디션(1~5, 소수 첫째 자리). 기록이 없으면 null */
  condition: number | null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** 최근 `weeks`주(이번 주 포함)의 평균 강도·컨디션. 오래된 주 → 이번 주 순서. */
export function summarizeTrend(
  records: Workout[],
  now: Date = new Date(),
  weeks: number = TREND_WEEKS,
): TrendPoint[] {
  const thisMonday = mondayOf(dayNumber(now));
  const sums = Array.from({ length: weeks }, () => ({
    count: 0,
    minutes: 0,
    intensity: 0,
    condition: 0,
  }));
  for (const record of records) {
    const day = dayNumber(new Date(record.date));
    if (Number.isNaN(day)) continue;
    const ago = (thisMonday - mondayOf(day)) / 7;
    if (!Number.isInteger(ago) || ago < 0 || ago >= weeks) continue; // 범위 밖
    const slot = sums[weeks - 1 - ago];
    slot.count += 1;
    slot.minutes += record.minutes;
    slot.intensity += record.intensity;
    slot.condition += record.condition;
  }
  return sums.map((slot, index) => {
    const ago = weeks - 1 - index;
    const monday = new Date((thisMonday - ago * 7) * 86_400_000);
    const sunday = new Date((thisMonday - ago * 7 + 6) * 86_400_000);
    return {
      weeksAgo: ago,
      startLabel: `${monday.getUTCMonth() + 1}/${monday.getUTCDate()}`,
      endLabel: `${sunday.getUTCMonth() + 1}/${sunday.getUTCDate()}`,
      count: slot.count,
      minutes: slot.minutes,
      intensity: slot.count ? round1(slot.intensity / slot.count) : null,
      condition: slot.count ? round1(slot.condition / slot.count) : null,
    };
  });
}
