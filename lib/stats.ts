import { dayNumber, mondayOf } from "@/lib/weekly";
import type { Workout } from "@/types/workout";

// 추가 기능 — 연속 기록, 주간 목표 달성, 종목별 통계, 개인 기록. 날짜는 브라우저 시간대 기준 달력 날짜. (PRD 날짜 규칙)

export const DEFAULT_WEEKLY_GOAL = 3; // PRD: 사용 첫 4주 동안 주 3회 이상
export const MIN_WEEKLY_GOAL = 1;
export const MAX_WEEKLY_GOAL = 7;

function recordDay(record: Workout): number {
  return dayNumber(new Date(record.date));
}

/**
 * 연속으로 운동한 날 수. 오늘 아직 운동(또는 쉬는 날 체크인)을 안 했어도 어제까지 이어졌다면 이어진 것으로 센다.
 * 쉬는 날 체크인한 날은 연속 일수에 더하지는 않지만 연속을 끊지도 않는다.
 */
export function currentDayStreak(
  records: Workout[],
  now: Date = new Date(),
  restDays: ReadonlySet<number> = new Set(),
): number {
  const days = new Set(records.map(recordDay).filter((d) => !Number.isNaN(d)));
  const today = dayNumber(now);
  let day = days.has(today) || restDays.has(today) ? today : today - 1;
  let streak = 0;
  while (days.has(day) || restDays.has(day)) {
    if (days.has(day)) streak++;
    day--;
  }
  return streak;
}

/** 지금까지 가장 길게 이어진 연속 운동 일수 */
export function longestDayStreak(records: Workout[]): number {
  const days = [
    ...new Set(records.map(recordDay).filter((d) => !Number.isNaN(d))),
  ].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && day === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

// 월요일 번호 → 그 주의 기록 횟수
function countsByWeek(records: Workout[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const record of records) {
    const day = recordDay(record);
    if (Number.isNaN(day)) continue;
    const monday = mondayOf(day);
    map.set(monday, (map.get(monday) ?? 0) + 1);
  }
  return map;
}

/** 이번 주 운동 횟수 */
export function thisWeekCount(
  records: Workout[],
  now: Date = new Date(),
): number {
  return countsByWeek(records).get(mondayOf(dayNumber(now))) ?? 0;
}

/** 주간 목표를 연속으로 달성한 주 수. 이번 주를 아직 못 채웠어도, 지난주까지 이어졌다면 이어진 것으로 센다. */
export function goalWeekStreak(
  records: Workout[],
  goal: number,
  now: Date = new Date(),
): number {
  const counts = countsByWeek(records);
  let monday = mondayOf(dayNumber(now));
  if ((counts.get(monday) ?? 0) < goal) monday -= 7;
  let streak = 0;
  while ((counts.get(monday) ?? 0) >= goal) {
    streak++;
    monday -= 7;
  }
  return streak;
}

export interface SportStat {
  sport: string;
  count: number;
  totalMinutes: number;
  longestMinutes: number;
}

/** 종목별 횟수·총 시간·가장 긴 운동. 횟수 많은 순 (같으면 총 시간 순). */
export function sportStats(records: Workout[]): SportStat[] {
  const map = new Map<string, SportStat>();
  for (const r of records) {
    const stat = map.get(r.sport) ?? {
      sport: r.sport,
      count: 0,
      totalMinutes: 0,
      longestMinutes: 0,
    };
    stat.count++;
    stat.totalMinutes += r.minutes;
    stat.longestMinutes = Math.max(stat.longestMinutes, r.minutes);
    map.set(r.sport, stat);
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes,
  );
}

export interface PersonalRecords {
  totalCount: number;
  totalMinutes: number;
  longest: { minutes: number; sport: string; date: string } | null;
  mostWeekCount: number; // 한 주에 가장 많이 운동한 횟수
  longestDayStreak: number;
}

export function personalRecords(records: Workout[]): PersonalRecords {
  let longest: PersonalRecords["longest"] = null;
  let totalMinutes = 0;
  for (const r of records) {
    totalMinutes += r.minutes;
    if (!longest || r.minutes > longest.minutes)
      longest = { minutes: r.minutes, sport: r.sport, date: r.date };
  }
  return {
    totalCount: records.length,
    totalMinutes,
    longest,
    mostWeekCount: Math.max(0, ...countsByWeek(records).values()),
    longestDayStreak: longestDayStreak(records),
  };
}
