import { requestParseWorkout } from "@/lib/ai-features";
import { handleAiPost } from "@/lib/api-helpers";
import {
  maskPersonalInfo,
  normalizeParse,
  type QuickFill,
} from "@/lib/quick-input";
import { MAX_PARSE_BYTES, parseRequestSchema } from "@/lib/schema";

// POST /api/parse-workout — 사용자가 쓴 운동 한 줄("어제 러닝 40분 힘들었어")을 입력 칸 값으로 바꿔 준다.
//   · 문장 하나(최대 300자)만 받아서 AI에 보낸다. 기록·식별 정보는 보내지 않는다.
//   · AI 답은 믿지 않고 범위를 다시 걸러 낸다. 못 읽은 항목은 null로 돌려줘서 사용자가 직접 고르게 한다.
//   · 요청 검사·8초 제한·실패 응답은 다른 AI API와 똑같다. (lib/api-helpers.ts)
export const maxDuration = 10;

export function POST(request: Request) {
  return handleAiPost<typeof parseRequestSchema._output, { fill: QuickFill }>(
    request,
    {
      maxBytes: MAX_PARSE_BYTES,
      schema: parseRequestSchema,
      tag: "parse-workout",
      run: async (data, signal) => ({
        fill: normalizeParse(
          await requestParseWorkout(maskPersonalInfo(data.text), signal),
        ),
      }),
    },
  );
}
