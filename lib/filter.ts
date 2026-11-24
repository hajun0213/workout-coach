import { dayNumber, mondayOf } from "@/lib/weekly";
import type { Workout } from "@/types/workout";

// 기록 목록 필터 — 종목·기간·통증. 날짜는 브라우저 시간대 기준 달력 날짜다. (PRD 날짜 규칙)
export const ALL_SPORTS = "__all__";

export const PERIODS = [
  { value: "all", label: "전체 기간" },
  { value: "week", label: "이번 주" },
  { value: "last7", label: "최근 7일" },
  { value: "month", label: "이번 달" },
  { value: "last30", label: "최근 30일" },
] as const;
export type Period = (typeof PERIODS)[number]["value"];

export interface RecordFilter {
  sport: string; // ALL_SPORTS면 전체
  period: Period;
  painOnly: boolean;
  query: string; // 종목 이름 검색어 (빈 문자열이면 검색 안 함)
}

export const NO_FILTER: RecordFilter = {
  sport: ALL_SPORTS,
  period: "all",
  painOnly: false,
  query: "",
};

/** 필터가 하나라도 걸려 있는지 */
export function isFiltered(filter: RecordFilter): boolean {
  return (
    filter.sport !== ALL_SPORTS ||
    filter.period !== "all" ||
    filter.painOnly ||
    filter.query.trim() !== ""
  );
}

function inPeriod(record: Workout, period: Period, now: Date): boolean {
  if (period === "all") return true;
  const day = dayNumber(new Date(record.date));
  if (Number.isNaN(day)) return false;
  const today = dayNumber(now);
  if (day > today) return false; // 미래 날짜는 어떤 기간에도 넣지 않는다
  switch (period) {
    case "week":
      return day >= mondayOf(today);
    case "last7":
      return today - day < 7;
    case "last30":
      return today - day < 30;
    case "month": {
      const d = new Date(record.date);
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    }
  }
}

/** 조건에 맞는 기록만 남긴다. (저장 순서는 그대로 유지) */
export function filterRecords(
  records: Workout[],
  filter: RecordFilter,
  now: Date = new Date(),
): Workout[] {
  // 검색어는 앞뒤 공백을 떼고 대소문자를 가리지 않고, 종목 이름에 포함되면 맞는 것으로 본다.
  const query = filter.query.trim().toLowerCase();
  return records.filter(
    (record) =>
      (query === "" || record.sport.toLowerCase().includes(query)) &&
      (filter.sport === ALL_SPORTS || record.sport === filter.sport) &&
      (!filter.painOnly || record.pain) &&
      inPeriod(record, filter.period, now),
  );
}
