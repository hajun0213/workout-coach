import { loadRecords, updateRecord } from "@/lib/storage";
import { selectRecordsForCoach } from "@/lib/select-records";
import type { CoachResponse } from "@/types/workout";

// Design Ref: §4.2 단계 3~7 — 저장된 기록 중 AI에 보낼 것을 고르고, /api/coach를 부르고, 결과를 기록에 붙여 저장한다.
// 화면(입력 폼, 이후 다시 시도 버튼)이 함께 쓴다. 자동 재시도는 하지 않는다. (PRD)

export const ANALYSIS_FAILED_MESSAGE =
  "분석에 실패했습니다. 다시 시도해 주세요";
/** 화면이 기다리는 최대 시간(ms). 서버는 8초에서 끊으므로 그보다 조금 더 기다린다. (PRD: 전체 10초 목표) */
const CLIENT_TIMEOUT_MS = 10_000;

function isCoachResponse(
  value: unknown,
): value is Omit<CoachResponse, "notices"> & { notices?: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as {
    feedback?: unknown;
    plan?: Record<string, unknown> | null;
  };
  return (
    typeof v.feedback === "string" &&
    v.feedback.length > 0 &&
    typeof v.plan === "object" &&
    v.plan !== null &&
    typeof v.plan.sport === "string" &&
    typeof v.plan.minutes === "number" &&
    typeof v.plan.intensity === "number"
  );
}

/**
 * 기록 한 건을 분석하고 결과를 그 기록에 저장한다.
 * @returns 성공하면 true, 실패(서버 오류·시간 초과·연결 실패·저장 실패)면 false
 */
export async function analyzeRecord(recordId: string): Promise<boolean> {
  const selection = selectRecordsForCoach(loadRecords(), recordId);
  if (!selection) return false;

  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection.request),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const data: unknown = await response.json();
    if (!isCoachResponse(data)) return false;

    const serverNotices = Array.isArray(data.notices)
      ? data.notices.filter((n): n is string => typeof n === "string")
      : [];
    const coach: CoachResponse = {
      feedback: data.feedback,
      plan: data.plan,
      notices: [...selection.notices, ...serverNotices],
    };
    return updateRecord(recordId, { coach });
  } catch {
    return false;
  }
}
