import { loadRecords } from "@/lib/storage";
import { buildRecommendRequest, type TodayInput } from "@/lib/recommend";
import type { RecommendResponse } from "@/types/workout";

// 운동 전 오늘의 추천 — /api/recommend를 부른다. 자동 재시도는 하지 않는다. (실패하면 null)
const CLIENT_TIMEOUT_MS = 10_000;

export async function fetchRecommendation(
  today: TodayInput,
): Promise<RecommendResponse | null> {
  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRecommendRequest(loadRecords(), today)),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<RecommendResponse>;
    const plan = data.plan;
    if (
      typeof data.message !== "string" ||
      data.message === "" ||
      typeof plan !== "object" ||
      plan === null ||
      typeof plan.sport !== "string" ||
      typeof plan.minutes !== "number" ||
      typeof plan.intensity !== "number"
    ) {
      return null;
    }
    return {
      message: data.message,
      plan,
      notices: Array.isArray(data.notices)
        ? data.notices.filter((n): n is string => typeof n === "string")
        : [],
    };
  } catch {
    return null;
  }
}
