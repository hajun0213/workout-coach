import type { z } from "zod";
import type { recommendRequestSchema } from "@/lib/schema";
import type {
  CoachPlan,
  CoachRequest,
  Level,
  RecommendResponse,
} from "@/types/workout";

// Design Ref: §5.1, §7 — AI 답을 믿지 않고 서버가 안전 규칙을 코드로 다시 적용한다. (PRD M2)
//   · 컨디션 2 이하 또는 통증이면 계획 강도를 방금 기록의 강도보다 높이지 않는다.
//   · 통증이 있으면 전문가 상담 안내를 붙인다.
//   · 피드백은 5문장까지만 남긴다.
//   · 계획의 종목이 비었거나 깨진 글자면 실패로 본다.

export const MAX_FEEDBACK_SENTENCES = 5;
export const PAIN_NOTICE =
  "통증이 계속되면 운동을 쉬고 의사·물리치료사 같은 전문가와 상담해 보세요.";
export const CAPPED_NOTICE =
  "컨디션이 낮거나 통증이 있어 다음 운동 강도를 올리지 않았어요.";
export const TIME_CAPPED_NOTICE =
  "운동 시간이 한 번에 크게 늘지 않도록 줄였어요.";
/** 오랜만에 다시 시작할 때 계획 시간의 상한(분) */
export const LIGHT_START_MAX_MINUTES = 45;

/** 안전 규칙을 적용한 결과. 계획이 쓸 수 없으면 null (호출한 쪽이 실패 처리). */
export interface SafeReply {
  feedback: string;
  plan: CoachPlan;
  notices: string[];
}

/**
 * 문장 끝(. ! ? …) 뒤나 줄바꿈에서 나눠 앞의 maxCount개만 남긴다.
 * 마침표 뒤에 공백이 없어도 나눈다. 단, 소수점(3.5km)처럼 마침표 뒤가 숫자이면 나누지 않는다.
 */
export function truncateSentences(text: string, maxCount: number): string {
  const sentences = text
    .trim()
    .split(/(?<=[.!?。…])(?![\d.!?。…])\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, maxCount).join(" ");
}

/** 글자 수 상한. 문장 수 제한을 피해 아주 긴 글이 나가지 않게 한다. */
export function capLength(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join("").trimEnd();
}

export const MAX_FEEDBACK_CHARS = 600;
export const MAX_MESSAGE_CHARS = 450;

// 깨진 글자(U+FFFD)나 제어 문자가 있으면 쓸 수 없는 값으로 본다.
export const BROKEN_TEXT = /[�\u0000-\u001F\u007F]/;

export function isUsablePlan(plan: CoachPlan): boolean {
  return plan.sport.trim().length > 0 && !BROKEN_TEXT.test(plan.sport);
}

export function applySafetyRules(
  reply: { feedback: string; plan: CoachPlan },
  request: CoachRequest,
): SafeReply | null {
  if (!isUsablePlan(reply.plan)) return null;
  const feedback = capLength(
    truncateSentences(reply.feedback, MAX_FEEDBACK_SENTENCES),
    MAX_FEEDBACK_CHARS,
  );
  if (!feedback || BROKEN_TEXT.test(feedback)) return null;

  const latest = request.records[request.records.length - 1];
  const risky = latest.condition <= 2 || latest.pain;
  const notices: string[] = [];
  let intensity: Level = reply.plan.intensity;
  let minutes = reply.plan.minutes;

  // 컨디션 2 이하·통증: 방금 기록의 강도를 넘지 않고, 방금 기록이 아주 힘들었어도 3을 넘지 않는다. 시간도 방금 기록 이하.
  if (risky) {
    const cap = Math.min(latest.intensity, 3) as Level;
    if (intensity > cap) {
      intensity = cap;
      notices.push(CAPPED_NOTICE);
    }
    if (minutes > latest.minutes) {
      minutes = latest.minutes;
      notices.push(TIME_CAPPED_NOTICE);
    }
  }
  // 오랜만에 시작: 가볍고 짧게
  if (request.lightStart) {
    if (intensity > 2) intensity = 2;
    if (minutes > LIGHT_START_MAX_MINUTES) minutes = LIGHT_START_MAX_MINUTES;
  }
  // 한 번에 방금 기록의 1.5배(최소 30분)보다 크게 늘리지 않는다.
  const jumpCap = Math.max(30, Math.ceil(latest.minutes * 1.5));
  if (minutes > jumpCap) {
    minutes = jumpCap;
    notices.push(TIME_CAPPED_NOTICE);
  }
  if (latest.pain) notices.push(PAIN_NOTICE);

  return {
    feedback,
    plan: { ...reply.plan, minutes, intensity },
    notices: [...new Set(notices)],
  };
}

// ── 운동 전 오늘의 추천 안전 규칙 ──
export const MAX_RECOMMEND_SENTENCES = 3;
export const RECOMMEND_LOW_NOTICE =
  "컨디션이 낮거나 통증이 있어 오늘은 가볍게(강도 2 이하) 추천했어요.";
export const RECOMMEND_AFTER_HARD_NOTICE =
  "최근에 힘든 운동을 해서 오늘은 강도를 3 이하로 맞췄어요.";

export const RECOMMEND_BEGINNER_NOTICE =
  "오랜만이거나 첫 기록이라 가볍고 짧게(강도 2 이하, 45분 이내) 추천했어요.";
export const RECOMMEND_MAX_MINUTES = 120;

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;

/**
 * 추천 답에 안전 규칙을 다시 적용한다. 쓸 수 없는 답이면 null.
 *   · 컨디션 2 이하 또는 통증이면 강도 2 이하, 통증이면 전문가 상담 안내.
 *   · 어제·오늘 강도 4 이상 운동을 했으면 강도 3 이하.
 *   · 쓸 수 있는 시간이 정해졌으면 그 안으로 줄인다.
 *   · 메시지는 3문장까지만 남긴다.
 */
export function applyRecommendSafety(
  reply: { message: string; plan: CoachPlan },
  request: RecommendRequest,
): RecommendResponse | null {
  if (!isUsablePlan(reply.plan)) return null;
  const message = capLength(
    truncateSentences(reply.message, MAX_RECOMMEND_SENTENCES),
    MAX_MESSAGE_CHARS,
  );
  if (!message || BROKEN_TEXT.test(message)) return null;

  const { condition, pain, availableMinutes } = request.today;
  const notices: string[] = [];
  let intensity: Level = reply.plan.intensity;
  let minutes = reply.plan.minutes;

  if ((condition <= 2 || pain) && intensity > 2) {
    intensity = 2;
    notices.push(RECOMMEND_LOW_NOTICE);
  }
  const recentHard = request.records.some(
    (record) => record.daysAgo <= 1 && record.intensity >= 4,
  );
  if (recentHard && intensity > 3) {
    intensity = 3;
    notices.push(RECOMMEND_AFTER_HARD_NOTICE);
  }
  // 오랜만에 시작하거나 기록이 하나도 없으면 가볍고 짧게
  const beginner = request.lightStart || request.records.length === 0;
  if (beginner) {
    if (intensity > 2) {
      intensity = 2;
      notices.push(RECOMMEND_BEGINNER_NOTICE);
    }
    if (minutes > LIGHT_START_MAX_MINUTES) {
      minutes = LIGHT_START_MAX_MINUTES;
      notices.push(RECOMMEND_BEGINNER_NOTICE);
    }
  }
  // 하루 추천 시간의 절대 상한
  if (minutes > RECOMMEND_MAX_MINUTES) {
    minutes = RECOMMEND_MAX_MINUTES;
    notices.push(TIME_CAPPED_NOTICE);
  }
  if (availableMinutes !== null && minutes > availableMinutes) {
    minutes = availableMinutes;
    notices.push(`쓸 수 있는 시간(${availableMinutes}분)에 맞춰 줄였어요.`);
  }
  if (pain) notices.push(PAIN_NOTICE);

  return {
    message,
    plan: { ...reply.plan, minutes, intensity },
    notices: [...new Set(notices)],
  };
}
