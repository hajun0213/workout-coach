import { personalRecords } from "@/lib/stats";
import type { Workout } from "@/types/workout";

// 개인 최고 기록 축하 — 방금 저장한 기록이 지금까지의 기록을 넘었는지 알려 준다.
// 기록이 너무 적을 때는 "처음이라 당연히 최고"가 되므로, 이전 기록이 3건 이상일 때만 판정한다.
export const MIN_RECORDS_FOR_BEST = 3;

/** 새 기록을 더하기 전(before)과 더한 뒤를 비교해 새로 깬 기록의 축하 문구를 돌려준다. */
export function detectNewBests(before: Workout[], record: Workout): string[] {
  if (before.length < MIN_RECORDS_FOR_BEST) return [];
  const prev = personalRecords(before);
  const next = personalRecords([...before, record]);
  const messages: string[] = [];

  if (next.longest && prev.longest && next.longest.minutes > prev.longest.minutes) {
    messages.push(
      `지금까지 가장 긴 운동이에요! (${next.longest.minutes}분, 이전 ${prev.longest.minutes}분)`,
    );
  }
  if (next.mostWeekCount > prev.mostWeekCount && prev.mostWeekCount >= 1) {
    messages.push(`한 주 최다 운동 횟수예요! (${next.mostWeekCount}회)`);
  }
  if (next.longestDayStreak > prev.longestDayStreak && next.longestDayStreak >= 3) {
    messages.push(`최장 연속 운동 기록이에요! (${next.longestDayStreak}일)`);
  }
  return messages;
}
