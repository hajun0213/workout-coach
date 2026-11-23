import { longestDayStreak, personalRecords } from "@/lib/stats";
import { dayNumber, mondayOf } from "@/lib/weekly";
import type { Workout } from "@/types/workout";

// 추가 기능 — 운동 달력(히트맵)과 배지. 모두 저장된 기록에서 계산하고, 날짜는 브라우저 시간대 기준 달력 날짜다.

export const HEATMAP_WEEKS = 12;

export interface HeatCell {
  /** 하루 단위 날짜 번호 */
  day: number;
  /** "11/23" 같은 표시용 날짜 */
  label: string;
  count: number;
  minutes: number;
  /** 0 없음 · 1 · 2 · 3 이상 (색 진하기) */
  level: 0 | 1 | 2 | 3;
  /** 오늘 이후 날짜 */
  future: boolean;
  /** 쉬는 날로 체크인한 날 (운동 기록이 없을 때만 표시) */
  rest: boolean;
}

/**
 * 최근 `weeks`주를 주 단위 열로 돌려준다. 오래된 주 → 이번 주, 각 열은 월요일 → 일요일 순서.
 */
export function buildHeatmap(
  records: Workout[],
  now: Date = new Date(),
  weeks: number = HEATMAP_WEEKS,
  restDays: ReadonlySet<number> = new Set(),
): HeatCell[][] {
  const today = dayNumber(now);
  const perDay = new Map<number, { count: number; minutes: number }>();
  for (const record of records) {
    const day = dayNumber(new Date(record.date));
    if (Number.isNaN(day)) continue;
    const entry = perDay.get(day) ?? { count: 0, minutes: 0 };
    entry.count += 1;
    entry.minutes += record.minutes;
    perDay.set(day, entry);
  }

  const firstMonday = mondayOf(today) - (weeks - 1) * 7;
  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = firstMonday + w * 7 + d;
      const date = new Date(day * 86_400_000);
      const entry = perDay.get(day) ?? { count: 0, minutes: 0 };
      column.push({
        day,
        label: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
        count: entry.count,
        minutes: entry.minutes,
        level:
          entry.count === 0
            ? 0
            : entry.count === 1
              ? 1
              : entry.count === 2
                ? 2
                : 3,
        future: day > today,
        rest: entry.count === 0 && restDays.has(day),
      });
    }
    columns.push(column);
  }
  return columns;
}

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  /** 아직 못 얻었을 때 보여 줄 진행 상황 (예: "7 / 10") */
  progress?: string;
}

/** 모은 기록으로 얻은 배지와 아직 못 얻은 배지를 모두 돌려준다. */
export function computeBadges(records: Workout[]): Badge[] {
  const total = records.length;
  const streak = longestDayStreak(records);
  const sports = new Set(records.map((record) => record.sport)).size;
  const pr = personalRecords(records);
  const longest = pr.longest?.minutes ?? 0;
  const lastTen = records.slice(-10);
  const painFreeTen =
    lastTen.length >= 10 && lastTen.every((record) => !record.pain);

  const counted = (
    id: string,
    icon: string,
    name: string,
    description: string,
    value: number,
    goal: number,
  ): Badge => ({
    id,
    icon,
    name,
    description,
    earned: value >= goal,
    progress: value >= goal ? undefined : `${value} / ${goal}`,
  });

  return [
    counted("first", "🌱", "첫 걸음", "첫 운동을 기록했어요", total, 1),
    counted("ten", "🔟", "열 번의 기록", "운동을 10번 기록했어요", total, 10),
    counted("thirty", "🏅", "꾸준한 사람", "운동을 30번 기록했어요", total, 30),
    counted("streak3", "🔥", "3일 연속", "3일 연속으로 운동했어요", streak, 3),
    counted(
      "streak7",
      "⚡",
      "일주일 연속",
      "7일 연속으로 운동했어요",
      streak,
      7,
    ),
    counted(
      "week3",
      "🎯",
      "한 주 3회",
      "한 주에 3번 이상 운동했어요",
      pr.mostWeekCount,
      3,
    ),
    counted(
      "sports3",
      "🧭",
      "종목 탐험가",
      "서로 다른 종목 3가지를 해 봤어요",
      sports,
      3,
    ),
    counted(
      "sports5",
      "🌈",
      "만능 선수",
      "서로 다른 종목 5가지를 해 봤어요",
      sports,
      5,
    ),
    counted(
      "hour",
      "⏱️",
      "한 시간 클럽",
      "한 번에 60분 이상 운동했어요",
      longest,
      60,
    ),
    counted(
      "long",
      "🏔️",
      "장거리 도전",
      "한 번에 120분 이상 운동했어요",
      longest,
      120,
    ),
    {
      id: "painfree",
      icon: "🛡️",
      name: "무리 없는 10회",
      description: "최근 10번 연속 통증 없이 운동했어요",
      earned: painFreeTen,
      progress: painFreeTen
        ? undefined
        : lastTen.length < 10
          ? `${lastTen.length} / 10`
          : "최근 기록에 통증이 있어요",
    },
  ];
}
