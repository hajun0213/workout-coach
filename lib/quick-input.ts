import { MAX_MINUTES, MAX_SPORT_LENGTH, MIN_MINUTES } from "@/lib/schema";
import type { Level } from "@/types/workout";

// 한 줄 빠른 입력 — AI가 읽어 낸 값을 입력 칸에 넣을 수 있는 값으로 걸러 낸다. 서버와 화면이 함께 쓴다.
// AI 답을 믿지 않는다: 범위를 벗어나거나 이상한 값은 "못 읽음(null)"으로 바꿔서 사용자가 직접 고르게 한다.

export interface QuickFill {
  minutes: number | null;
  sport: string | null;
  intensity: Level | null;
  condition: Level | null;
  pain: boolean | null;
}

const asLevel = (value: number | null): Level | null =>
  value !== null && Number.isInteger(value) && value >= 1 && value <= 5
    ? (value as Level)
    : null;

const EMPTY_WORDS = new Set([
  "null",
  "none",
  "n/a",
  "undefined",
  "없음",
  "모름",
  "-",
]);

// 제어 문자(줄바꿈·탭 포함)와 깨진 글자(U+FFFD)는 쓸 수 없는 값이다.
const BROKEN_TEXT = /[�\u0000-\u001F\u007F]/;

export function normalizeParse(raw: {
  minutes: number | null;
  sport: string | null;
  intensity: number | null;
  condition: number | null;
  pain: boolean | null;
}): QuickFill {
  // 모델이 "null"·"없음" 같은 글자를 종목으로 돌려주는 경우를 걸러 낸다.
  const rawSport = raw.sport?.trim() ?? "";
  const sport = EMPTY_WORDS.has(rawSport.toLowerCase()) ? "" : rawSport;
  return {
    minutes:
      raw.minutes !== null &&
      Number.isInteger(raw.minutes) &&
      raw.minutes >= MIN_MINUTES &&
      raw.minutes <= MAX_MINUTES
        ? raw.minutes
        : null,
    sport:
      sport.length > 0 &&
      sport.length <= MAX_SPORT_LENGTH &&
      !BROKEN_TEXT.test(sport)
        ? sport
        : null,
    intensity: asLevel(raw.intensity),
    condition: asLevel(raw.condition),
    pain: raw.pain,
  };
}

/** 하나라도 읽어 냈는지 */
export function hasAnyValue(fill: QuickFill): boolean {
  return (
    fill.minutes !== null ||
    fill.sport !== null ||
    fill.intensity !== null ||
    fill.condition !== null ||
    fill.pain !== null
  );
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?<!\d)0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g;

/** AI로 보내기 전에 문장 속 이메일·전화번호 모양을 가린다. (이름 같은 것은 알아낼 수 없어 화면 안내로 막는다) */
export function maskPersonalInfo(text: string): string {
  return text.replace(EMAIL, "[이메일]").replace(PHONE, "[번호]");
}
