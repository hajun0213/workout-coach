import { normalizeParse, type QuickFill } from "@/lib/quick-input";

// 한 줄 빠른 입력 — /api/parse-workout를 부른다. 자동 재시도는 하지 않는다. (실패하면 null)
const CLIENT_TIMEOUT_MS = 10_000;

export async function parseWorkoutText(
  text: string,
): Promise<QuickFill | null> {
  try {
    const response = await fetch("/api/parse-workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { fill?: Record<string, unknown> };
    const f = data.fill;
    if (typeof f !== "object" || f === null) return null;
    // 서버 응답도 한 번 더 걸러서 입력 칸에는 안전한 값만 넣는다.
    return normalizeParse({
      minutes: typeof f.minutes === "number" ? f.minutes : null,
      sport: typeof f.sport === "string" ? f.sport : null,
      intensity: typeof f.intensity === "number" ? f.intensity : null,
      condition: typeof f.condition === "number" ? f.condition : null,
      pain: typeof f.pain === "boolean" ? f.pain : null,
    });
  } catch {
    return null;
  }
}
