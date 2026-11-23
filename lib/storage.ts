import type { Workout } from "@/types/workout";

// Design Ref: §4.4 — 브라우저(localStorage)에 운동 기록을 저장·불러오기·삭제한다.
// 로그인과 서버 저장이 없어서, 기록은 이 기기·브라우저에만 남는다.
// 서버 화면을 그릴 때는 localStorage가 없으므로, 화면은 아래 subscribeRecords/getRecordsSnapshot으로
// (useSyncExternalStore) 읽어서 처음 그려진 뒤에 기록을 보여 준다.

/** 저장 이름. 저장 형태를 바꾸게 되면 v2처럼 번호를 올린다. */
export const STORAGE_KEY = "workout-records-v1";

function isLevel(value: unknown): boolean {
  return (
    Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5
  );
}

// 저장된 값이 우리가 약속한 기록 모양인지 가볍게 확인한다. (깨졌거나 직접 고친 값이 화면을 망가뜨리지 않게)
function isWorkout(value: unknown): value is Workout {
  if (typeof value !== "object" || value === null) return false;
  const w = value as Record<string, unknown>;
  const coach = w.coach as Record<string, unknown> | undefined;
  return (
    typeof w.id === "string" &&
    typeof w.date === "string" &&
    typeof w.minutes === "number" &&
    typeof w.sport === "string" &&
    isLevel(w.intensity) &&
    isLevel(w.condition) &&
    typeof w.pain === "boolean" &&
    (w.helpful === undefined || typeof w.helpful === "boolean") &&
    (coach === undefined ||
      (typeof coach === "object" &&
        coach !== null &&
        typeof coach.feedback === "string"))
  );
}

// 저장된 글자를 기록 목록으로 바꾼다. 비었거나 깨졌으면 빈 목록이다.
function parseRecords(raw: string | null): Workout[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isWorkout) : [];
  } catch {
    return [];
  }
}

// 브라우저가 아니거나, 시크릿 모드·저장 차단 등으로 접근이 막히면 null
function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// ── 변경 알림: 기록이 바뀌면 화면(목록 등)이 자동으로 다시 그려지게 한다. ──
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** 기록이 바뀔 때 알려 달라고 등록한다. 같은 탭의 변경과 다른 탭의 변경을 모두 알린다. 해제 함수를 돌려준다. */
export function subscribeRecords(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    // 다른 탭에서 우리 기록이 바뀌었거나, 저장소 전체가 비워진 경우(key가 null)
    if (event.key === null || event.key === STORAGE_KEY) listener();
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

const EMPTY: Workout[] = [];
let cachedRaw: string | null | undefined;
let cachedRecords: Workout[] = EMPTY;

/** 지금 저장된 기록. 저장된 내용이 그대로면 같은 목록(같은 참조)을 돌려줘서 불필요한 다시 그리기를 막는다. */
export function getRecordsSnapshot(): Workout[] {
  const storage = getStorage();
  if (!storage) return EMPTY;
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRecords = parseRecords(raw);
  }
  return cachedRecords;
}

// 저장 공간이 가득 찼거나 막혀 있으면 false → 화면이 "저장하지 못했어요"를 안내한다. (§4.4)
function writeRecords(records: Workout[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    return false;
  }
  notify();
  return true;
}

/** 저장된 기록을 모두 불러온다. 저장된 순서(오래된 것 → 최신)이고, 없거나 깨졌으면 빈 목록이다. */
export function loadRecords(): Workout[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    return parseRecords(storage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/** 기록 한 건을 맨 뒤(최신)에 추가한다. 저장에 성공하면 true. */
export function addRecord(record: Workout): boolean {
  return writeRecords([...loadRecords(), record]);
}

/** 기록 한 건을 삭제한다. 없는 번호여도 오류 없이 처리하고, 저장에 성공하면 true. */
export function deleteRecord(id: string): boolean {
  return writeRecords(loadRecords().filter((record) => record.id !== id));
}

/** 기록을 전체 삭제한다. 성공하면 true. (화면에서 확인 창을 거친 뒤에 부른다.) */
export function clearRecords(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }
  notify();
  return true;
}

/** 기록 한 건의 일부 항목(분석 결과·도움 응답 등)을 고쳐 저장한다. 없는 번호면 false, 저장에 성공하면 true. */
export function updateRecord(
  id: string,
  patch: Partial<Omit<Workout, "id">>,
): boolean {
  const records = loadRecords();
  if (!records.some((record) => record.id === id)) return false;
  return writeRecords(
    records.map((record) =>
      record.id === id ? { ...record, ...patch } : record,
    ),
  );
}

/**
 * 가져온 기록을 지금 기록에 합친다. 이미 있는 번호(id)의 기록은 건너뛰고, 저장 날짜순(오래된 것 → 최신)으로 다시 정렬한다.
 * @returns 저장에 성공하면 { added, duplicates }, 막혀 있으면 null
 */
export function mergeRecords(
  incoming: Workout[],
): { added: number; duplicates: number } | null {
  const current = loadRecords();
  const ids = new Set(current.map((record) => record.id));
  const fresh = incoming.filter((record) => !ids.has(record.id));
  if (fresh.length === 0) return { added: 0, duplicates: incoming.length };
  const time = (record: Workout) => new Date(record.date).getTime();
  const merged = [...current, ...fresh].sort((a, b) => {
    const diff = time(a) - time(b);
    return Number.isNaN(diff) ? 0 : diff;
  });
  if (!writeRecords(merged)) return null;
  return { added: fresh.length, duplicates: incoming.length - fresh.length };
}
