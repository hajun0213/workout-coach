import type { Level } from "@/types/workout";
import {
  CONFIRM_OVER_MINUTES,
  OTHER_SPORT,
  workoutInputSchema,
  type WorkoutInput,
} from "@/lib/schema";

// Design Ref: §4.2 [2 검사], §7 — 입력 폼의 값을 검사해서 빈 항목과 잘못된 값을 한국어로 알려 준다.
// Plan SC: S4 — 빈 항목, 0분 이하, 300분 초과 확인, 1440분 초과를 화면에서 안내한다.

/** 입력 폼이 가지고 있는 값 (아직 검사 전) */
export interface WorkoutFormValues {
  minutes: string; // 입력 칸의 글자 그대로
  sport: string; // 목록에서 고른 값 ("" = 아직 안 고름)
  customSport: string; // "기타"를 골랐을 때 직접 입력한 값
  intensity: Level | null;
  condition: Level | null;
  pain: boolean;
}

export type FieldName = "minutes" | "sport" | "intensity" | "condition";
export type FieldErrors = Partial<Record<FieldName, string>>;

export type ValidationResult =
  | { ok: false; errors: FieldErrors }
  | {
      ok: true;
      value: WorkoutInput;
      /** 300분 초과라서 저장 전에 "맞나요?" 확인을 받아야 하면 true */
      needsConfirm: boolean;
    };

// 숫자 모양만 통과: 12, -5, 1.5 (1e3, 0x10, 빈 칸 등은 제외)
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function validateWorkoutForm(
  values: WorkoutFormValues,
): ValidationResult {
  const errors: FieldErrors = {};

  // 운동 시간
  const minutesText = values.minutes.trim();
  let minutes: number | undefined;
  if (minutesText === "") {
    errors.minutes = "운동 시간을 입력해 주세요";
  } else if (!DECIMAL_PATTERN.test(minutesText)) {
    errors.minutes = "운동 시간을 숫자로 입력해 주세요";
  } else {
    minutes = Number(minutesText);
  }

  // 종목: "기타"를 골랐으면 직접 입력한 값을 종목으로 쓴다. 비어 있으면 빈 항목이다.
  let sport = values.sport;
  if (sport === "") {
    errors.sport = "종목을 선택해 주세요";
  } else if (sport === OTHER_SPORT) {
    sport = values.customSport.trim();
    if (sport === "") errors.sport = "종목을 직접 입력해 주세요";
  }

  // 나머지 규칙(범위·정수·20자·단계)은 zod가 검사한다. 위에서 이미 빈 항목 안내를 만든 칸은 그 문구를 우선한다.
  const parsed = workoutInputSchema.safeParse({
    minutes,
    sport,
    intensity: values.intensity ?? undefined,
    condition: values.condition ?? undefined,
    pain: values.pain,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as FieldName | "pain" | undefined;
      if (field && field !== "pain" && !errors[field]) {
        errors[field] = issue.message;
      }
    }
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: parsed.data,
    needsConfirm: parsed.data.minutes > CONFIRM_OVER_MINUTES,
  };
}
