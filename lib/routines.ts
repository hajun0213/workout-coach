import { z } from "zod";
import { workoutInputSchema, WEEK_DAYS } from "@/lib/schema";

// 추가 기능 — 운동 루틴 템플릿. "월·수·금 러닝 30분"처럼 반복하는 운동을 저장해 두고,
// 오늘이 그 요일이면 한 번에 입력 칸을 채운다. 이 브라우저(localStorage)에만 저장한다.
export const ROUTINES_KEY = "routines-v1";
export const MAX_ROUTINES = 7;

/** 요일 번호: 0=월 … 6=일 (WEEK_DAYS 순서와 같다) */
export const DAY_NAMES = WEEK_DAYS;

export const routineInputSchema = z.object({
  /** 반복하는 요일 (1~7개, 중복 없음) */
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1, "요일을 하나 이상 골라 주세요")
    .max(7)
    .refine((d) => new Set(d).size === d.length, "요일이 겹쳐요"),
  sport: workoutInputSchema.shape.sport,
  minutes: workoutInputSchema.shape.minutes,
  intensity: workoutInputSchema.shape.intensity,
});

export const routineSchema = routineInputSchema.extend({
  id: z.string().min(1).max(100),
});

export type RoutineInput = z.infer<typeof routineInputSchema>;
export type Routine = z.infer<typeof routineSchema>;

/** 날짜의 요일 번호(0=월 … 6=일). 브라우저 시간대 기준. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** 요일 목록을 "월·수·금"처럼 */
export function formatDays(days: readonly number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d])
    .join("·");
}

/** 오늘 요일에 해당하는 루틴들 */
export function routinesForToday(
  routines: readonly Routine[],
  now: Date = new Date(),
): Routine[] {
  const today = weekdayIndex(now);
  return routines.filter((routine) => routine.days.includes(today));
}

/** 입력 검사. 통과하면 정리된 값(요일 오름차순), 아니면 첫 오류 문구. */
export function validateRoutine(
  input: unknown,
): { ok: true; value: RoutineInput } | { ok: false; message: string } {
  const parsed = routineInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "입력을 확인해 주세요",
    };
  }
  return {
    ok: true,
    value: {
      ...parsed.data,
      days: [...parsed.data.days].sort((a, b) => a - b),
    },
  };
}

// ── 저장 (localStorage) ──
function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function subscribeRoutines(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ROUTINES_KEY) listener();
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

function parseRoutines(raw: string | null): Routine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const routines: Routine[] = [];
    for (const item of parsed) {
      const r = routineSchema.safeParse(item);
      if (r.success) routines.push(r.data);
    }
    return routines.slice(0, MAX_ROUTINES);
  } catch {
    return [];
  }
}

const EMPTY: Routine[] = [];
let cachedRaw: string | null | undefined;
let cachedRoutines: Routine[] = EMPTY;

/** 저장된 루틴 목록. 내용이 그대로면 같은 값(같은 참조)을 돌려준다. */
export function getRoutinesSnapshot(): Routine[] {
  let raw: string | null = null;
  try {
    raw = getStorage()?.getItem(ROUTINES_KEY) ?? null;
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRoutines = parseRoutines(raw);
  }
  return cachedRoutines;
}

function write(routines: Routine[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  return true;
}

export type AddResult = "ok" | "full" | "invalid" | "failed";

/** 루틴을 추가한다. 최대 7개. */
export function addRoutine(input: unknown): AddResult {
  const checked = validateRoutine(input);
  if (!checked.ok) return "invalid";
  const current = getRoutinesSnapshot();
  if (current.length >= MAX_ROUTINES) return "full";
  const routine: Routine = {
    ...checked.value,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  return write([...current, routine]) ? "ok" : "failed";
}

/** 루틴을 삭제한다. 없는 번호여도 오류 없이 처리하고, 저장에 성공하면 true. */
export function deleteRoutine(id: string): boolean {
  return write(getRoutinesSnapshot().filter((routine) => routine.id !== id));
}
