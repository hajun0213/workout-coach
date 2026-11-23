import { z } from "zod";

// Design Ref: §2.2, §6.2 — 입력 검사 규칙(zod). 화면(입력 폼)과 서버 API가 같은 규칙을 쓴다.
// PRD M1 입력 검사 규칙: 운동 시간 0분 이하·소수 불가, 300분 초과(1440분 이하)는 확인 후 저장, 1440분 초과 불가.

/** 종목 목록 (PRD M1). "기타"를 고르면 직접 입력한다. */
export const SPORT_OPTIONS = [
  "러닝",
  "걷기",
  "웨이트",
  "요가",
  "수영",
  "자전거",
  "축구",
  "농구",
  "배드민턴",
  "테니스",
  "탁구",
  "야구",
  "배구",
  "골프",
  "등산",
  "필라테스",
  "복싱",
  "기타",
] as const;
export const OTHER_SPORT = "기타";
/** 종목 이름 최대 글자 수 (직접 입력 포함) */
export const MAX_SPORT_LENGTH = 20;

/** AI에 한 번에 보내는 기록의 최대 건수 (방금 기록 포함) */
export const MAX_AI_RECORDS = 7;

/** 운동 시간 한계(분) */
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 1440;
/** 이 값을 넘으면 저장 전에 "맞나요?" 확인을 받는다. */
export const CONFIRM_OVER_MINUTES = 300;

const levelSchema = (message: string) =>
  z.union(
    [z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)],
    { error: message },
  );

/** 입력 폼이 만들어 내는 값 (검사를 통과한 뒤의 모양) */
export const workoutInputSchema = z.object({
  minutes: z
    .number({ error: "운동 시간을 숫자로 입력해 주세요" })
    .int("운동 시간은 정수(분)로 입력해 주세요")
    .min(MIN_MINUTES, "0분 이하는 저장할 수 없어요. 1분 이상으로 입력해 주세요")
    .max(MAX_MINUTES, "1440분(24시간)을 넘는 기록은 저장할 수 없어요"),
  sport: z
    .string({ error: "종목을 선택해 주세요" })
    .trim()
    .min(1, "종목을 선택해 주세요")
    .max(MAX_SPORT_LENGTH, `종목은 ${MAX_SPORT_LENGTH}자 이하로 입력해 주세요`),
  intensity: levelSchema("강도를 선택해 주세요"),
  condition: levelSchema("컨디션을 선택해 주세요"),
  pain: z.boolean(),
});

export type WorkoutInput = z.infer<typeof workoutInputSchema>;

// ── 서버 API(/api/coach)가 받는 요청 (Design §5) ──
// 서버도 화면과 별개로 다시 검사한다. 화면 검사는 우회될 수 있기 때문이다.
// 정해 둔 항목 외의 필드(이름·연락처 등)는 있어도 버려서 AI에 보내지 않는다.

/** 요청 본문의 최대 크기(바이트). 기록 7건은 약 2KB라 넉넉한 상한이다. */
export const MAX_REQUEST_BYTES = 8 * 1024;

const aiRecordSchema = z.object({
  daysAgo: z.number().int().min(0).max(3650), // 방금 기록 기준 며칠 전 (10년 이내)
  minutes: workoutInputSchema.shape.minutes,
  sport: workoutInputSchema.shape.sport,
  intensity: workoutInputSchema.shape.intensity,
  condition: workoutInputSchema.shape.condition,
  pain: z.boolean(),
});

export const coachRequestSchema = z.object({
  records: z.array(aiRecordSchema).min(1).max(MAX_AI_RECORDS),
  lightStart: z.boolean(),
});

/** AI가 돌려주는 답(서버가 AI 답을 믿지 않고 다시 검사하는 규칙). 안내 문구(notices)는 AI가 아니라 서버가 만든다. */
export const coachAiReplySchema = z.object({
  feedback: z.string().trim().min(1),
  plan: z.object({
    sport: z.string().trim().min(1).max(40),
    minutes: z.number().int().min(MIN_MINUTES).max(MAX_MINUTES),
    intensity: levelSchema("강도"),
  }),
});
