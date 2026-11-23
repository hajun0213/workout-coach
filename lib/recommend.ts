import { LONG_GAP_DAYS } from "@/lib/select-records";
import { MAX_AI_RECORDS } from "@/lib/schema";
import { dayNumber } from "@/lib/weekly";
import type { RecommendRequest } from "@/lib/safety";
import type { Workout } from "@/types/workout";

// 운동 전 오늘의 추천 — 서버로 보낼 요청을 만든다. 오늘 기준 며칠 전, 시간, 종목, 강도, 컨디션, 통증만 담는다. (식별 정보 없음)
// 마지막 기록이 15일(LONG_GAP_DAYS) 이상 전이면 기록은 보내지 않고 "오랜만이라 가볍게" 표시(lightStart)만 보낸다.

export interface TodayInput {
  condition: 1 | 2 | 3 | 4 | 5;
  pain: boolean;
  availableMinutes: number | null;
}

export function buildRecommendRequest(
  all: Workout[],
  today: TodayInput,
  now: Date = new Date(),
): RecommendRequest {
  const todayDay = dayNumber(now);
  const dated = all
    .map((record) => ({ record, day: dayNumber(new Date(record.date)) }))
    .filter((item) => !Number.isNaN(item.day) && item.day <= todayDay)
    .sort((a, b) => a.day - b.day); // 오래된 것 → 최신 (같은 날은 저장 순서 유지)

  if (dated.length === 0) {
    return { records: [], lightStart: false, today };
  }
  const gap = todayDay - dated[dated.length - 1].day;
  if (gap >= LONG_GAP_DAYS) {
    return { records: [], lightStart: true, today };
  }
  return {
    records: dated.slice(-MAX_AI_RECORDS).map(({ record, day }) => ({
      daysAgo: todayDay - day,
      minutes: record.minutes,
      sport: record.sport,
      intensity: record.intensity,
      condition: record.condition,
      pain: record.pain,
    })),
    lightStart: false,
    today,
  };
}
