// 추가 기능 — 휴식일 체크인. "오늘은 쉬었어요"를 눌러 쉬는 날도 기록으로 남긴다.
// 쉬는 날은 연속 기록(연속 운동 일수)을 끊지 않고, 회복 신호에는 "오늘은 푹 쉬는 날"로 반영된다.
// 이 브라우저(localStorage)에만 저장하고, 날짜는 브라우저 시간대 기준 달력 날짜("2026-11-23")로 적는다.
export const REST_KEY = "rest-days-v1";
export const MAX_REST_DAYS = 400; // 너무 오래된 쉬는 날은 정리한다

/** 달력 날짜를 "YYYY-MM-DD"로 */
export function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD"를 하루 단위 날짜 번호로. 형식이 틀리면 NaN. (weekly.ts의 dayNumber와 같은 기준) */
export function keyToDayNumber(key: string): number {
  if (!KEY_PATTERN.test(key)) return NaN;
  const [y, m, d] = key.split("-").map(Number);
  const time = Date.UTC(y, m - 1, d);
  const check = new Date(time);
  // 2월 30일 같은 없는 날짜는 거른다.
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return NaN;
  }
  return Math.round(time / 86_400_000);
}

/** 저장된 쉬는 날 목록을 날짜 번호 집합으로 */
export function restDayNumbers(keys: readonly string[]): Set<number> {
  const set = new Set<number>();
  for (const key of keys) {
    const n = keyToDayNumber(key);
    if (!Number.isNaN(n)) set.add(n);
  }
  return set;
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function subscribeRest(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === REST_KEY) listener();
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

function parseKeys(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is string =>
        typeof v === "string" && !Number.isNaN(keyToDayNumber(v)),
    );
  } catch {
    return [];
  }
}

const EMPTY: string[] = [];
let cachedRaw: string | null | undefined;
let cachedKeys: string[] = EMPTY;

/** 저장된 쉬는 날 목록. 내용이 그대로면 같은 값(같은 참조)을 돌려준다. */
export function getRestSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = getStorage()?.getItem(REST_KEY) ?? null;
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedKeys = parseKeys(raw);
  }
  return cachedKeys;
}

function write(keys: string[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  const trimmed = [...new Set(keys)].sort().slice(-MAX_REST_DAYS);
  try {
    storage.setItem(REST_KEY, JSON.stringify(trimmed));
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  return true;
}

/** 오늘을 쉬는 날로 표시하거나 취소한다(누를 때마다 바뀜). 저장에 성공하면 true. */
export function toggleRestDay(now: Date = new Date()): boolean {
  const key = dateKey(now);
  const current = getRestSnapshot();
  return write(
    current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key],
  );
}
