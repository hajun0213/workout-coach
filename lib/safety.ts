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

/** 안전 규칙을 적용한 결과. 계획이 쓸 수 없으면 null (호출한 쪽이 실패 처리). */
export interface SafeReply {
  feedback: string;
  plan: CoachPlan;
  notices: string[];
}

/** 문장 끝(. ! ? …) 뒤의 공백·줄바꿈에서 나눠 앞의 maxCount개만 남긴다. */
export function truncateSentences(text: string, maxCount: number): string {
  const sentences = text
    .trim()
    .split(/(?<=[.!?。…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, maxCount).join(" ");
}

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
  const feedback = truncateSentences(reply.feedback, MAX_FEEDBACK_SENTENCES);
  if (!feedback || BROKEN_TEXT.test(feedback)) return null;

  const latest = request.records[request.records.length - 1];
  const risky = latest.condition <= 2 || latest.pain;
  const notices: string[] = [];
  let intensity: Level = reply.plan.intensity;

  if (risky && intensity > latest.intensity) {
    intensity = latest.intensity;
    notices.push(CAPPED_NOTICE);
  }
  if (latest.pain) notices.push(PAIN_NOTICE);

  return { feedback, plan: { ...reply.plan, intensity }, notices };
}

// ── 운동 전 오늘의 추천 안전 규칙 ──
export const MAX_RECOMMEND_SENTENCES = 3;
export const RECOMMEND_LOW_NOTICE =
  "컨디션이 낮거나 통증이 있어 오늘은 가볍게(강도 2 이하) 추천했어요.";
export const RECOMMEND_AFTER_HARD_NOTICE =
  "최근에 힘든 운동을 해서 오늘은 강도를 3 이하로 맞췄어요.";

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
  const message = truncateSentences(reply.message, MAX_RECOMMEND_SENTENCES);
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
  if (availableMinutes !== null && minutes > availableMinutes) {
    minutes = availableMinutes;
    notices.push(`쓸 수 있는 시간(${availableMinutes}분)에 맞춰 줄였어요.`);
  }
  if (pain) notices.push(PAIN_NOTICE);

  return { message, plan: { ...reply.plan, minutes, intensity }, notices };
}
