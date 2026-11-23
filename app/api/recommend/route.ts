import { requestRecommend } from "@/lib/ai-features";
import { AiFailure } from "@/lib/ai";
import { handleAiPost } from "@/lib/api-helpers";
import { applyRecommendSafety, type RecommendRequest } from "@/lib/safety";
import { MAX_REQUEST_BYTES, recommendRequestSchema } from "@/lib/schema";
import type { RecommendResponse } from "@/types/workout";

// POST /api/recommend — 운동 전에 오늘의 컨디션·통증·쓸 수 있는 시간과 최근 기록으로 오늘 할 운동을 추천한다.
//   · 코칭 API와 같은 기록 모양(며칠 전·시간·종목·강도·컨디션·통증)만 받는다. 식별 정보는 없다.
//   · AI 답은 믿지 않고 안전 규칙(강도 상한·시간 상한·통증 상담)을 서버가 다시 적용한다.
export const maxDuration = 10;

export function POST(request: Request) {
  return handleAiPost<RecommendRequest, RecommendResponse>(request, {
    maxBytes: MAX_REQUEST_BYTES,
    schema: recommendRequestSchema,
    tag: "recommend",
    run: async (data, signal) => {
      const reply = await requestRecommend(data, signal);
      const safe = applyRecommendSafety(reply, data);
      if (!safe) throw new AiFailure("format");
      return safe;
    },
  });
}
