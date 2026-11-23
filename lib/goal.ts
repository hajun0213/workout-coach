import {
  DEFAULT_WEEKLY_GOAL,
  MAX_WEEKLY_GOAL,
  MIN_WEEKLY_GOAL,
} from "@/lib/stats";

// 추가 기능 — 주간 운동 목표(회). 기록과 마찬가지로 이 브라우저(localStorage)에만 저장한다.
export const GOAL_KEY = "weekly-goal-v1";

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function sanitize(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= MIN_WEEKLY_GOAL && n <= MAX_WEEKLY_GOAL
    ? n
    : DEFAULT_WEEKLY_GOAL;
}

const listeners = new Set<() => void>();

export function subscribeGoal(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GOAL_KEY) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** 지금 저장된 주간 목표(회). 없거나 깨졌으면 기본값 3회. 숫자라서 같은 값이면 다시 그리지 않는다. */
export function getGoalSnapshot(): number {
  try {
    const storage = getStorage();
    return sanitize(storage ? storage.getItem(GOAL_KEY) : null);
  } catch {
    return DEFAULT_WEEKLY_GOAL;
  }
}

/** 주간 목표를 저장한다. 범위(1~7회) 밖이거나 저장이 막혀 있으면 false. */
export function setWeeklyGoal(goal: number): boolean {
  if (
    !Number.isInteger(goal) ||
    goal < MIN_WEEKLY_GOAL ||
    goal > MAX_WEEKLY_GOAL
  ) {
    return false;
  }
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(GOAL_KEY, String(goal));
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  return true;
}
