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
  "스트레칭",
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

export const aiRecordSchema = z.object({
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

// ── 한 줄 빠른 입력(/api/parse-workout) — 사용자가 쓴 문장을 AI가 입력 칸 값으로 바꿔 준다. ──
/** 입력 문장의 최대 글자 수와 요청 본문 최대 크기(바이트) */
export const MAX_QUICK_TEXT = 300;
export const MAX_PARSE_BYTES = 2 * 1024;

export const parseRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_QUICK_TEXT),
});

/** AI가 문장에서 읽어 낸 값. 문장에 없는 항목은 null이다. (서버가 받은 뒤 normalizeParse로 다시 걸러 낸다) */
export const parseAiReplySchema = z.object({
  minutes: z.number().nullable(),
  sport: z.string().nullable(),
  intensity: z.number().nullable(),
  condition: z.number().nullable(),
  pain: z.boolean().nullable(),
});

// ── 운동 전 오늘의 추천(/api/recommend) — 오늘 컨디션과 최근 기록으로 오늘 할 운동을 추천한다. ──
export const MIN_AVAILABLE_MINUTES = 10;
export const MAX_AVAILABLE_MINUTES = 300;

export const recommendRequestSchema = z.object({
  /** 최근 기록(최대 7건). daysAgo는 "오늘" 기준이다. */
  records: z.array(aiRecordSchema).max(MAX_AI_RECORDS),
  /** 마지막 기록이 15일 이상 전이면 true (오랜만에 가볍게 시작) */
  lightStart: z.boolean(),
  today: z.object({
    condition: levelSchema("컨디션"),
    pain: z.boolean(),
    /** 오늘 쓸 수 있는 시간(분). 모르면 null */
    availableMinutes: z
      .number()
      .int()
      .min(MIN_AVAILABLE_MINUTES)
      .max(MAX_AVAILABLE_MINUTES)
      .nullable(),
  }),
});

export const recommendAiReplySchema = z.object({
  message: z.string().trim().min(1),
  plan: z.object({
    sport: z.string().trim().min(1).max(40),
    minutes: z.number().int().min(MIN_MINUTES).max(MAX_MINUTES),
    intensity: levelSchema("강도"),
  }),
});

// ── AI 주간 리포트(/api/weekly-report) — 최근 4주 기록을 요약하고 다음 주 계획을 짠다. ──
/** 리포트에 쓰는 기록 수의 상한 (최근 4주 안의 기록) */
export const MAX_REPORT_RECORDS = 40;
export const MAX_REPORT_BYTES = 16 * 1024;
export const WEEK_DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export const weeklyReportRequestSchema = z.object({
  /** 최근 28일 안의 기록. daysAgo는 "오늘" 기준이다. 오래된 것 → 최신 */
  records: z
    .array(
      z.object({
        daysAgo: z.number().int().min(0).max(27),
        minutes: workoutInputSchema.shape.minutes,
        sport: workoutInputSchema.shape.sport,
        intensity: workoutInputSchema.shape.intensity,
        condition: workoutInputSchema.shape.condition,
        pain: z.boolean(),
      }),
    )
    .min(1)
    .max(MAX_REPORT_RECORDS),
  /** 사용자가 정한 주간 목표(회) */
  weeklyGoal: z.number().int().min(1).max(7),
  /** 월요일 시작 기준 최근 4주(이번 주 포함)의 정확한 주별 합계. 오래된 주 → 이번 주. AI가 숫자를 지어내지 않게 화면이 미리 계산해서 보낸다. */
  weekly: z
    .array(
      z.object({
        weeksAgo: z.number().int().min(0).max(3),
        count: z.number().int().min(0).max(100),
        minutes: z.number().int().min(0).max(10080),
      }),
    )
    .length(4),
});

export const weeklyReportAiReplySchema = z.object({
  summary: z.string().trim().min(1),
  tips: z.array(z.string().trim().min(1)).max(6),
  plan: z
    .array(
      z.object({
        day: z.enum(WEEK_DAYS),
        sport: z.string().trim().max(40).nullable(),
        minutes: z.number().int().min(0).max(MAX_MINUTES),
        intensity: levelSchema("강도").nullable(),
      }),
    )
    .length(7),
});
