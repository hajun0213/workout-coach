import { getGoalSnapshot } from "@/lib/goal";
import { MAX_REPORT_RECORDS, weeklyReportAiReplySchema } from "@/lib/schema";
import type { WeeklyReportRequest } from "@/lib/safety-weekly";
import { loadRecords } from "@/lib/storage";
import { dayNumber, summarizeWeeks } from "@/lib/weekly";
import type { Workout, WeeklyReport } from "@/types/workout";
import { z } from "zod";

// AI 주간 리포트 — 요청 만들기, 이 브라우저에 저장(localStorage), 불러오기. 가장 최근 리포트 한 건만 남긴다.
export const REPORT_DAYS = 28; // 리포트에 쓰는 최근 기간(일)
export const REPORT_KEY = "weekly-report-v1";

/** 최근 28일 안의 기록으로 서버에 보낼 요청을 만든다. 식별 정보(id·정확한 시각)는 넣지 않는다. 기록이 없으면 null. */
export function buildWeeklyReportRequest(
  all: Workout[],
  weeklyGoal: number,
  now: Date = new Date(),
): WeeklyReportRequest | null {
  const today = dayNumber(now);
  const recent = all
    .map((record) => ({ record, day: dayNumber(new Date(record.date)) }))
    .filter(
      (item) =>
        !Number.isNaN(item.day) &&
        item.day <= today &&
        today - item.day < REPORT_DAYS,
    )
    .sort((a, b) => a.day - b.day) // 오래된 것 → 최신
    .slice(-MAX_REPORT_RECORDS);
  if (recent.length === 0) return null;
  return {
    records: recent.map(({ record, day }) => ({
      daysAgo: today - day,
      minutes: record.minutes,
      sport: record.sport,
      intensity: record.intensity,
      condition: record.condition,
      pain: record.pain,
    })),
    weeklyGoal,
    // 주별 횟수·시간은 화면이 정확히 세서 보낸다. (전체 기록 기준)
    weekly: summarizeWeeks(all, now, 4).map((w) => ({
      weeksAgo: w.weeksAgo,
      count: w.count,
      minutes: w.minutes,
    })),
  };
}

// 저장된 리포트가 약속한 모양인지 다시 검사한다. (깨졌거나 직접 고친 값이 화면을 망가뜨리지 않게)
const storedSchema = weeklyReportAiReplySchema.extend({
  notices: z.array(z.string().max(500)).max(20),
  createdAt: z.string().refine((v) => !Number.isNaN(new Date(v).getTime())),
});

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function subscribeReport(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === REPORT_KEY) listener();
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

let cachedRaw: string | null | undefined;
let cachedReport: WeeklyReport | null = null;

/** 저장된 가장 최근 리포트. 없거나 깨졌으면 null. 내용이 그대로면 같은 값(같은 참조)을 돌려준다. */
export function getReportSnapshot(): WeeklyReport | null {
  let raw: string | null = null;
  try {
    raw = getStorage()?.getItem(REPORT_KEY) ?? null;
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedReport = null;
    if (raw) {
      try {
        const parsed = storedSchema.safeParse(JSON.parse(raw));
        if (parsed.success) cachedReport = parsed.data as WeeklyReport;
      } catch {
        cachedReport = null;
      }
    }
  }
  return cachedReport;
}

/** 리포트를 저장한다. 저장이 막혀 있으면 false. */
export function saveReport(report: WeeklyReport): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(REPORT_KEY, JSON.stringify(report));
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  return true;
}

/** 지금 기록과 주간 목표로 리포트를 만들 요청을 준비한다. */
export function prepareReportRequest(): WeeklyReportRequest | null {
  return buildWeeklyReportRequest(loadRecords(), getGoalSnapshot());
}
