import { currentDayStreak } from "@/lib/stats";
import { dayNumber } from "@/lib/weekly";
import type { Workout } from "@/types/workout";

// 추가 기능 — 회복 신호. 최근 기록만 보고 "오늘은 쉬어 가면 좋겠다"를 알려 주는 규칙 기반 안내다.
// AI를 쓰지 않고(비용·지연 없음), 어떤 규칙 때문인지 그대로 보여 준다. 의학적 진단이 아니다.

export type RecoveryLevel = "good" | "caution" | "rest";

export interface RecoveryStatus {
  level: RecoveryLevel;
  title: string;
  /** 이 판단에 쓰인 이유들 (좋음이면 격려 한 줄) */
  reasons: string[];
}

export const STREAK_LIMIT = 6; // 이 일수 이상 연속으로 운동하면 알린다
export const HARD_INTENSITY = 4; // 이 강도 이상을 "힘든 운동"으로 본다
export const HARD_COUNT_LIMIT = 3; // 최근 7일 중 힘든 운동이 이 횟수 이상이면 알린다
export const LOW_CONDITION = 2; // 이 컨디션 이하를 "낮음"으로 본다

/**
 * 지금 회복 상태를 판단한다. 기록이 하나도 없으면 null.
 * @param now 기준 시각 (테스트용으로 바꿀 수 있다)
 */
export function assessRecovery(
  records: Workout[],
  now: Date = new Date(),
): RecoveryStatus | null {
  if (records.length === 0) return null;
  const today = dayNumber(now);
  const withAge = records
    .map((record) => ({ record, ago: today - dayNumber(new Date(record.date)) }))
    .filter((item) => !Number.isNaN(item.ago) && item.ago >= 0)
    .sort((a, b) => a.ago - b.ago); // 최신 → 오래된
  const last7 = withAge.filter((item) => item.ago <= 6);

  if (last7.length === 0) {
    return {
      level: "good",
      title: "회복은 충분해요",
      reasons: ["최근 7일 동안 기록이 없어요. 가볍게 다시 시작해 보세요."],
    };
  }

  const reasons: string[] = [];
  let needsRest = false;

  const streak = currentDayStreak(records, now);
  if (streak >= STREAK_LIMIT) {
    reasons.push(`${streak}일 연속으로 운동했어요. 몸이 회복할 하루를 만들어 주세요.`);
  }

  const hard = last7.filter((item) => item.record.intensity >= HARD_INTENSITY).length;
  if (hard >= HARD_COUNT_LIMIT) {
    reasons.push(
      `최근 7일 동안 힘든 운동(강도 ${HARD_INTENSITY} 이상)을 ${hard}번 했어요. 가벼운 운동이나 휴식을 섞어 보세요.`,
    );
  }

  const latest = last7.slice(0, 3).map((item) => item.record.condition); // 최신 → 과거
  const lowTwice = latest.length >= 2 && latest[0] <= LOW_CONDITION && latest[1] <= LOW_CONDITION;
  const falling =
    latest.length === 3 && latest[0] < latest[1] && latest[1] < latest[2] && latest[0] <= 3;
  if (lowTwice || falling) {
    reasons.push(
      lowTwice
        ? "최근 컨디션이 계속 낮아요. 오늘은 쉬거나 가볍게 움직여 보세요."
        : "최근 컨디션이 점점 떨어지고 있어요. 무리하지 않는 게 좋아요.",
    );
    needsRest = true;
  }

  const painDays = withAge.filter((item) => item.ago <= 2 && item.record.pain).length;
  if (painDays >= 1) {
    reasons.push("최근 며칠 사이 통증이 있었어요. 통증이 계속되면 전문가와 상담해 보세요.");
    needsRest = true;
  }

  if (reasons.length === 0) {
    return {
      level: "good",
      title: "회복 상태가 좋아요",
      reasons: ["최근 기록에서 무리한 신호가 보이지 않아요. 이 흐름을 이어 가세요."],
    };
  }
  if (needsRest || reasons.length >= 2) {
    return { level: "rest", title: "오늘은 휴식을 권장해요", reasons };
  }
  return { level: "caution", title: "가볍게 운동해 보세요", reasons };
}
