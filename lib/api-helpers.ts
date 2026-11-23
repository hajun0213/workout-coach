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

// ── 호출 횟수 제한 (같은 IP가 1분에 너무 많이 부르는 것을 막는다) ──
// 서버 메모리에만 기록하는 "최소한의" 제한이다. 서버리스 환경(Vercel)에서는 서버 인스턴스마다 따로 세기 때문에
// 완전하지 않다. 그래서 배포할 때 Vercel 방화벽의 호출 횟수 제한을 함께 설정한다. (PLAN 19번)
// IP를 알 수 없으면(로컬 개발 등) 제한하지 않는다. Vercel에서는 항상 IP 헤더가 붙는다.
export const RATE_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT = 20; // 1분에 IP당 AI API 호출 수 (API 종류별로 따로 센다)
const MAX_TRACKED_KEYS = 5_000;
const hits = new Map<string, number[]>();

/** 이 키의 호출이 한도를 넘었는지 확인하고, 넘지 않았다면 이번 호출을 기록한다. 넘었으면 true. */
export function isRateLimited(
  key: string,
  limit: number,
  now: number = Date.now(),
): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_TRACKED_KEYS) {
    // 메모리가 계속 늘지 않게 오래된 키를 정리한다.
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

/** 요청을 보낸 IP. 플랫폼이 붙여 주는 헤더만 믿고, 없으면 null. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  return ip ? ip.slice(0, 64) : null;
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
/**
 * 이 사이트 화면에서 보낸 JSON 요청인지 확인한다. 아니면 거절 응답을 돌려주고, 통과하면 null.
 * 다른 사이트가 방문자의 브라우저로 몰래 보낸 요청(비용 남용)을 줄이기 위한 것이다.
 *   · Content-Type이 application/json이어야 한다. (text/plain 같은 "단순 요청"은 사전 확인 없이 브라우저가 보낼 수 있다)
 *   · 브라우저가 알려 주는 Sec-Fetch-Site가 same-origin이 아니거나, Origin의 주소가 이 서버 주소와 다르면 거절한다.
 *   · 이 검사는 브라우저가 아닌 도구(curl 등)가 직접 보내는 요청은 막지 못한다. 그것은 호출 횟수 제한(배포 설정)으로 막는다.
 */
export function rejectForeignRequest(request: Request): Response | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return invalidRequest("요청 형식이 올바르지 않아요");
  }
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") {
    return errorResponse(403, "FORBIDDEN", "허용되지 않은 요청이에요");
  }
  const origin = request.headers.get("origin");
  if (origin !== null) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = "";
    }
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if (originHost !== host) {
      return errorResponse(403, "FORBIDDEN", "허용되지 않은 요청이에요");
    }
  }
  return null;
}

export async function handleAiPost<TReq, TRes>(
  request: Request,
  options: {
    maxBytes: number;
    schema: ZodType<TReq>;
    /** 로그에 남기는 이름 (예: "coach") */
    tag: string;
    /** AI를 기다리는 최대 시간(ms). 정하지 않으면 8초 (PRD: 서버는 8초까지만 기다린다) */
    timeoutMs?: number;
    /** 1분에 IP당 호출 한도. 정하지 않으면 20회 */
    rateLimitPerMinute?: number;
    run: (data: TReq, signal: AbortSignal) => Promise<TRes>;
  },
): Promise<Response> {
  const foreign = rejectForeignRequest(request);
  if (foreign) return foreign;

  const ip = clientIp(request);
  if (
    ip !== null &&
    isRateLimited(
      `${options.tag}:${ip}`,
      options.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT,
    )
  ) {
    const response = errorResponse(
      429,
      "RATE_LIMITED",
      "요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요",
    );
    response.headers.set("Retry-After", "60");
    return response;
  }

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
