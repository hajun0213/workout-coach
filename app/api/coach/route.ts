import { AI_TIMEOUT_MS, AiFailure, requestCoach } from "@/lib/ai";
import { MAX_REQUEST_BYTES, coachRequestSchema } from "@/lib/schema";
import type { CoachResponse } from "@/types/workout";

// Design Ref: §5 — POST /api/coach: 화면이 고른 기록(CoachRequest)을 받아 AI 분석 결과(CoachResponse)를 돌려준다.
//   · 요청을 서버에서 다시 검사한다. (기록 1~7건, 종목 20자, 요청 크기 8KB)
//   · 서버는 AI 응답을 8초까지만 기다린다. 넘으면 504.
//   · 요청 내용은 로그에 남기지 않고, 오류가 나도 키·내부 정보를 응답에 넣지 않는다. (PRD §7)
//   · AI 오류·형식 오류는 502, 시간 초과는 504. 사용자에게 보이는 문구는 둘 다 같다.
// 안전 규칙(강도 상한·통증 상담, PLAN 11번)과 지시문 전체(10번)는 이후 작업에서 채운다.

// Vercel 서버 함수의 최대 실행 시간(초). 서버가 AI를 8초에 끊고 응답할 시간을 남겨 둔다.
// 배포 요금제의 한도와 맞는지는 PLAN 19번에서 다시 확인한다.
export const maxDuration = 10;

const FAILURE_MESSAGE = "분석에 실패했습니다. 다시 시도해 주세요";

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

const invalidRequest = (message: string) =>
  errorResponse(400, "VALIDATION_ERROR", message);

// 요청 본문을 읽되, 상한(바이트)을 넘으면 더 읽지 않고 null을 돌려준다. (아주 큰 요청을 끝까지 읽지 않으려는 것)
async function readBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function POST(request: Request) {
  // 1) 읽기: 크기 상한 → JSON → 모양 검사. 내용은 로그에 남기지 않는다.
  const bodyText = await readBodyWithLimit(request, MAX_REQUEST_BYTES);
  if (bodyText === null) return invalidRequest("요청이 너무 커요");

  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return invalidRequest("요청 형식이 올바르지 않아요");
  }
  const parsed = coachRequestSchema.safeParse(json);
  if (!parsed.success) return invalidRequest("요청 내용이 올바르지 않아요");

  // 2) AI 호출: 8초 제한 + 화면이 접속을 끊으면 같이 멈춘다.
  const timeout = AbortSignal.timeout(AI_TIMEOUT_MS);
  const signal = AbortSignal.any([timeout, request.signal]);
  try {
    const reply = await requestCoach(parsed.data, signal);
    // 안내 문구(notices)는 서버가 만든다. 통증 상담 권유는 PLAN 11번에서 추가한다.
    const body: CoachResponse = { ...reply, notices: [] };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure =
      error instanceof AiFailure
        ? error
        : timeout.aborted
          ? new AiFailure("timeout")
          : new AiFailure("upstream");
    // 로그에는 실패 종류와 상태 코드만 남긴다. (요청 내용·키·AI 답은 남기지 않는다.)
    console.error(`[coach] ${failure.kind}${failure.status ? ` ${failure.status}` : ""}`);
    return failure.kind === "timeout"
      ? errorResponse(504, "AI_TIMEOUT", FAILURE_MESSAGE)
      : errorResponse(502, "AI_ERROR", FAILURE_MESSAGE);
  }
}
