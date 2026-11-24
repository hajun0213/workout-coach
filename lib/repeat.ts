import { MAX_SPORT_LENGTH } from "@/lib/schema";
import type { QuickFill } from "@/lib/quick-input";

// "같은 운동 다시 기록" — 기록 목록에서 고른 기록의 종목·시간·강도를 홈의 입력 칸으로 넘긴다.
// 주소(URL)에 값을 싣지 않고 이 탭의 sessionStorage에만 잠깐 두며, 홈이 한 번 읽으면 바로 지운다.
// 컨디션·통증은 오늘 상태가 다르니 넘기지 않는다.
const KEY = "workout-coach:repeat";

export function setRepeatFill(source: {
  sport: string;
  minutes: number;
  intensity: number;
}): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(source));
    return true;
  } catch {
    return false;
  }
}

/** 넘겨 둔 값을 한 번 읽고 지운다. 값이 모양에 맞지 않으면 쓰지 않는다. */
export function takeRepeatFill(): QuickFill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    sessionStorage.removeItem(KEY);
    const v = JSON.parse(raw) as {
      sport?: unknown;
      minutes?: unknown;
      intensity?: unknown;
    };
    if (
      typeof v.sport !== "string" ||
      v.sport.length < 1 ||
      v.sport.length > MAX_SPORT_LENGTH ||
      typeof v.minutes !== "number" ||
      !Number.isInteger(v.minutes) ||
      v.minutes < 1 ||
      v.minutes > 1440 ||
      typeof v.intensity !== "number" ||
      !Number.isInteger(v.intensity) ||
      v.intensity < 1 ||
      v.intensity > 5
    ) {
      return null;
    }
    return {
      sport: v.sport,
      minutes: v.minutes,
      intensity: v.intensity as QuickFill["intensity"],
      condition: null,
      pain: null,
    };
  } catch {
    return null;
  }
}
