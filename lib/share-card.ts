import { currentDayStreak } from "@/lib/stats";
import { dayNumber, mondayOf } from "@/lib/weekly";
import type { Workout } from "@/types/workout";

// 공유 이미지 카드 — 이번 주(월~일) 요약 숫자만 모은다. 이름·메모 같은 개인 정보는 담지 않는다.

export interface ShareWeek {
  rangeLabel: string; // 예: "11/23 ~ 11/29"
  count: number;
  minutes: number;
  goal: number;
  topSport: string | null; // 이번 주에 가장 많이 한 종목
  avgIntensity: number | null; // 소수 첫째 자리까지
  streak: number; // 오늘 기준 연속 운동일
}

export function summarizeShareWeek(
  records: Workout[],
  goal: number,
  now: Date = new Date(),
): ShareWeek {
  const monday = mondayOf(dayNumber(now));
  const week = records.filter((r) => {
    const day = dayNumber(new Date(r.date));
    return !Number.isNaN(day) && day >= monday && day < monday + 7;
  });

  const bySport = new Map<string, number>();
  let minutes = 0;
  let intensitySum = 0;
  for (const r of week) {
    minutes += r.minutes;
    intensitySum += r.intensity;
    bySport.set(r.sport, (bySport.get(r.sport) ?? 0) + 1);
  }
  const topSport =
    [...bySport.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // 월요일 번호 → "월/일" (UTC 기준 번호라 UTC 날짜로 되돌린다)
  const label = (day: number) => {
    const d = new Date(day * 86_400_000);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  };

  return {
    rangeLabel: `${label(monday)} ~ ${label(monday + 6)}`,
    count: week.length,
    minutes,
    goal,
    topSport,
    avgIntensity:
      week.length > 0 ? Math.round((intensitySum / week.length) * 10) / 10 : null,
    streak: currentDayStreak(records, now),
  };
}

export function formatShareMinutes(total: number): string {
  if (total < 60) return `${total}분`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}
