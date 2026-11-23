import { AiFailure, requestCoach } from "@/lib/ai";
import { handleAiPost } from "@/lib/api-helpers";
import { applySafetyRules } from "@/lib/safety";
import { MAX_REQUEST_BYTES, coachRequestSchema } from "@/lib/schema";
import type { CoachResponse } from "@/types/workout";

// Design Ref: §5 — POST /api/coach: 화면이 고른 기록(CoachRequest)을 받아 AI 분석 결과(CoachResponse)를 돌려준다.
//   · 요청 검사·8초 제한·실패 응답은 lib/api-helpers.ts가 모든 AI API와 똑같이 처리한다.
//   · AI 답은 믿지 않고 안전 규칙(강도 상한·통증 상담·5문장)을 서버가 다시 적용한다. (PRD §7)

// Vercel 서버 함수의 최대 실행 시간(초). 서버가 AI를 8초에 끊고 응답할 시간을 남겨 둔다.
// 배포 요금제의 한도와 맞는지는 PLAN 19번에서 다시 확인한다.
export const maxDuration = 10;

export function POST(request: Request) {
  return handleAiPost<typeof coachRequestSchema._output, CoachResponse>(
    request,
    {
      maxBytes: MAX_REQUEST_BYTES,
      schema: coachRequestSchema,
      tag: "coach",
      run: async (data, signal) => {
        const reply = await requestCoach(data, signal);
        const safe = applySafetyRules(reply, data);
        if (!safe) throw new AiFailure("format");
        return safe;
      },
    },
  );
}
