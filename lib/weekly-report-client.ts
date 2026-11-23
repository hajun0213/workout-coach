import { prepareReportRequest, saveReport } from "@/lib/weekly-report";
import type { WeeklyReport } from "@/types/workout";

// AI 주간 리포트 — /api/weekly-report를 부르고 결과를 저장한다. 자동 재시도는 하지 않는다.
const CLIENT_TIMEOUT_MS = 25_000; // 서버가 최대 20초 기다린다

export type ReportOutcome = "ok" | "no-records" | "failed";

export async function createWeeklyReport(): Promise<ReportOutcome> {
  const request = prepareReportRequest();
  if (!request) return "no-records";
  try {
    const response = await fetch("/api/weekly-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    if (!response.ok) return "failed";
    const data = (await response.json()) as Partial<WeeklyReport>;
    if (
      typeof data.summary !== "string" ||
      !Array.isArray(data.tips) ||
      !Array.isArray(data.plan) ||
      data.plan.length !== 7
    ) {
      return "failed";
    }
    const report: WeeklyReport = {
      summary: data.summary,
      tips: data.tips.filter((t): t is string => typeof t === "string"),
      plan: data.plan,
      notices: Array.isArray(data.notices)
        ? data.notices.filter((n): n is string => typeof n === "string")
        : [],
      createdAt: new Date().toISOString(),
    };
    return saveReport(report) ? "ok" : "failed";
  } catch {
    return "failed";
  }
}
