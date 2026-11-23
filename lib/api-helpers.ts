import type { ZodType } from "zod";
import { AI_TIMEOUT_MS, AiFailure } from "@/lib/ai";

// 서버 API(/api/*)가 함께 쓰는 부분 — 크기 제한·요청 검사·8초 제한·실패 응답을 한 곳에서 통일한다. (Design §5, §7)
//   · 요청을 서버에서 다시 검사한다. 요청 내용은 로그에 남기지 않는다.
//   · AI 오류·형식 오류는 502, 시간 초과는 504. 사용자에게 보이는 문구는 둘 다 같다.

export const FAILURE_MESSAGE = "분석에 실패했습니다. 다시 시도해 주세요";

export function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

const invalidRequest = (message: string) =>
  errorResponse(400, "VALIDATION_ERROR", message);

// 요청 본문을 읽되, 상한(바이트)을 넘으면 더 읽지 않고 null을 돌려준다. (아주 큰 요청을 끝까지 읽지 않으려는 것)
export async function readBodyWithLimit(
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

/**
 * AI를 쓰는 POST API의 공통 처리.
 * 크기 상한 → JSON → 모양 검사 → AI 호출(8초 제한, 접속이 끊기면 같이 중단) → 실패는 통일된 응답.
 * @param run 검사를 통과한 요청으로 AI를 부르고 응답 본문을 돌려준다. 쓸 수 없는 답이면 AiFailure("format")를 던진다.
 */
export async function handleAiPost<TReq, TRes>(
  request: Request,
  options: {
    maxBytes: number;
    schema: ZodType<TReq>;
    /** 로그에 남기는 이름 (예: "coach") */
    tag: string;
    /** AI를 기다리는 최대 시간(ms). 정하지 않으면 8초 (PRD: 서버는 8초까지만 기다린다) */
    timeoutMs?: number;
    run: (data: TReq, signal: AbortSignal) => Promise<TRes>;
  },
): Promise<Response> {
  const bodyText = await readBodyWithLimit(request, options.maxBytes);
  if (bodyText === null) return invalidRequest("요청이 너무 커요");

  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return invalidRequest("요청 형식이 올바르지 않아요");
  }
  const parsed = options.schema.safeParse(json);
  if (!parsed.success) return invalidRequest("요청 내용이 올바르지 않아요");

  const timeout = AbortSignal.timeout(options.timeoutMs ?? AI_TIMEOUT_MS);
  const signal = AbortSignal.any([timeout, request.signal]);
  try {
    const body = await options.run(parsed.data, signal);
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure =
      error instanceof AiFailure
        ? error
        : timeout.aborted
          ? new AiFailure("timeout")
          : new AiFailure("upstream");
    // 로그에는 실패 종류와 상태 코드만 남긴다. (요청 내용·키·AI 답은 남기지 않는다.)
    console.error(
      `[${options.tag}] ${failure.kind}${failure.status ? ` ${failure.status}` : ""}`,
    );
    return failure.kind === "timeout"
      ? errorResponse(504, "AI_TIMEOUT", FAILURE_MESSAGE)
      : errorResponse(502, "AI_ERROR", FAILURE_MESSAGE);
  }
}
