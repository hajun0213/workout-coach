import { MAX_AI_RECORDS } from "@/lib/schema";
import type { AiRecord, CoachRequest, Workout } from "@/types/workout";

// Design Ref: §4.1, §4.2 [4 고르기] — AI에 보낼 기록을 고르고, 화면에 보여 줄 안내 문구를 만든다.
//   · 방금 기록을 포함해 최근 최대 7건을 고른다. (같은 날 기록도 모두 포함, 마지막이 방금 기록)
//   · 방금 기록과 직전 기록의 달력 날짜 차이가 15일 이상이면 방금 기록만 보내고 lightStart=true.
//   · 저장된 전체 기록이 3건 미만이면 "기록이 더 쌓이면 정확해진다" 안내를 만든다.
//   · AI에는 며칠 전·시간·종목·강도·컨디션·통증만 보낸다. (id·정확한 시각은 보내지 않는다. PRD §7)
// 날짜 계산은 서버가 아니라 브라우저의 시간대 기준 달력 날짜로 한다. (§4.1)

/** 직전 기록과 이 일수 이상 차이 나면 "오랜만"으로 본다. */
export const LONG_GAP_DAYS = 15;
/** 저장된 전체 기록이 이 건수 미만이면 "기록이 더 쌓이면…" 안내를 보여 준다. */
export const FEW_RECORDS_UNDER = 3;

// 안내 문구 원문은 PRD를 따른다.
export const FEW_RECORDS_NOTICE = "기록이 더 쌓이면 정확해진다";
export const LONG_GAP_NOTICE = "오랜만이라 가볍게 시작해요";

export interface RecordSelection {
  /** 서버(/api/coach)로 보낼 내용 */
  request: CoachRequest;
  /** 화면이 만든 안내 문구 (서버가 주는 통증 상담 안내와 합쳐서 보여 준다) */
  notices: string[];
}

// 브라우저 시간대 기준의 "달력 날짜"를 하루 단위 번호로 바꾼다. 시각은 버린다.
// (밤 11시 59분과 다음 날 0시 1분은 1일 차이, 같은 날 아침·저녁은 0일 차이. 서머타임에도 안전하다.)
// 날짜를 읽을 수 없으면 NaN.
function calendarDay(iso: string): number {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return NaN;
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

// 두 기록의 달력 날짜 차이(일). 날짜를 읽을 수 없으면 0으로 본다. (오랜만 판정이나 며칠 전 계산이 틀어지지 않게)
function daysBetween(laterIso: string, earlierIso: string): number {
  const diff = calendarDay(laterIso) - calendarDay(earlierIso);
  return Number.isNaN(diff) ? 0 : Math.max(0, diff);
}

function toAiRecord(record: Workout, target: Workout): AiRecord {
  return {
    daysAgo: daysBetween(target.date, record.date),
    minutes: record.minutes,
    sport: record.sport,
    intensity: record.intensity,
    condition: record.condition,
    pain: record.pain,
  };
}

/**
 * AI에 보낼 기록과 안내 문구를 고른다.
 * @param all 저장된 전체 기록 (저장된 순서: 오래된 것 → 최신)
 * @param targetId "방금 기록"의 번호. 보통 방금 저장한 기록이고, 다시 시도할 때는 그 기록이다.
 *                 방금 기록보다 뒤에 저장된 기록은 보내지 않는다.
 * @returns 방금 기록을 찾지 못하면 null
 */
export function selectRecordsForCoach(
  all: readonly Workout[],
  targetId: string,
): RecordSelection | null {
  const targetIndex = all.findIndex((record) => record.id === targetId);
  if (targetIndex === -1) return null;
  const target = all[targetIndex];
  const previous = targetIndex > 0 ? all[targetIndex - 1] : null;

  const notices: string[] = [];
  if (all.length < FEW_RECORDS_UNDER) notices.push(FEW_RECORDS_NOTICE);

  const lightStart =
    previous !== null && daysBetween(target.date, previous.date) >= LONG_GAP_DAYS;
  if (lightStart) notices.push(LONG_GAP_NOTICE);

  // 오랜만이면 방금 기록만, 아니면 방금 기록까지의 최근 최대 7건 (오래된 것 → 최신, 마지막이 방금 기록)
  const picked = lightStart
    ? [target]
    : all.slice(Math.max(0, targetIndex + 1 - MAX_AI_RECORDS), targetIndex + 1);

  return {
    request: {
      records: picked.map((record) => toAiRecord(record, target)),
      lightStart,
    },
    notices,
  };
}
