import { AiFailure } from "@/lib/ai";
import { requestWeeklyReport } from "@/lib/ai-weekly";
import { handleAiPost } from "@/lib/api-helpers";
import {
  applyWeeklySafety,
  type WeeklyReportRequest,
} from "@/lib/safety-weekly";
import { MAX_REPORT_BYTES, weeklyReportRequestSchema } from "@/lib/schema";
import type { WeeklyReport } from "@/types/workout";

// POST /api/weekly-report — 최근 4주 기록(며칠 전·시간·종목·강도·컨디션·통증)과 주간 목표로 요약과 다음 주 계획을 만든다.
//   · 식별 정보는 받지 않는다. AI 답은 믿지 않고 안전 규칙(쉬는 날·연속 고강도·통증 시 강도 상한)을 서버가 다시 적용한다.
// 7일치 계획까지 만드느라 코칭(8초)보다 오래 걸려서, 이 API만 최대 20초까지 기다린다. (실행 시간 한도는 PLAN 19번에서 배포 환경에 맞게 다시 확인한다)
export const maxDuration = 25;
const WEEKLY_TIMEOUT_MS = 20_000;

export function POST(request: Request) {
  return handleAiPost<WeeklyReportRequest, Omit<WeeklyReport, "createdAt">>(
    request,
    {
      maxBytes: MAX_REPORT_BYTES,
      schema: weeklyReportRequestSchema,
      tag: "weekly-report",
      timeoutMs: WEEKLY_TIMEOUT_MS,
      rateLimitPerMinute: 5, // 가장 비싼 API라 더 엄격하게
      run: async (data, signal) => {
        const reply = await requestWeeklyReport(data, signal);
        const safe = applyWeeklySafety(reply, data);
        if (!safe) throw new AiFailure("format");
        return safe;
      },
    },
  );
}
