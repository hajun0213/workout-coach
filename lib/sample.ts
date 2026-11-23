import { mergeRecords } from "@/lib/storage";
import type { CoachResponse, Level, Workout } from "@/types/workout";

// 추가 기능 — 샘플 기록. 처음 보는 사람도 그래프·통계·분석 결과가 채워진 화면을 바로 볼 수 있게 한다.
// 기록은 "오늘 기준 며칠 전"으로 만들어서, 언제 눌러도 최근 12주(운동 달력이 보여 주는 기간)가 채워진다. 실제 AI는 호출하지 않는다.
export const SAMPLE_ID_PREFIX = "sample-";

type Row = [
  ago: number,
  sport: string,
  minutes: number,
  intensity: Level,
  condition: Level,
  pain: boolean,
];

// [며칠 전, 종목, 분, 강도, 컨디션, 통증]
// 12주 전에는 가볍게 시작해서 점점 늘고, 5주 전에는 한 주를 거의 쉬는 모습으로 만들어 달력에 변화가 보이게 했다.
const ROWS: Row[] = [
  // 12~9주 전: 가볍게 시작
  [82, "걷기", 30, 1, 3, false],
  [79, "러닝", 20, 2, 3, false],
  [74, "걷기", 40, 1, 4, false],
  [71, "요가", 30, 1, 3, false],
  [68, "러닝", 25, 2, 4, false],
  [66, "웨이트", 35, 2, 3, false],
  [64, "걷기", 45, 1, 4, false],
  // 8~6주 전: 주 3회 습관
  [61, "러닝", 30, 2, 4, false],
  [59, "웨이트", 40, 3, 4, false],
  [57, "요가", 30, 1, 3, false],
  [54, "러닝", 30, 3, 4, false],
  [52, "수영", 35, 2, 4, false],
  [50, "걷기", 50, 1, 3, false],
  [47, "웨이트", 45, 3, 4, false],
  [45, "러닝", 35, 3, 3, false],
  [43, "배드민턴", 60, 3, 5, false],
  // 5주 전: 바빠서 거의 쉼
  [40, "러닝", 30, 2, 3, false],
  [37, "요가", 40, 1, 4, false],
  // 4주 전: 다시 시작
  [33, "러닝", 35, 3, 4, false],
  [31, "웨이트", 45, 3, 4, false],
  [29, "걷기", 40, 1, 3, false],
  // 최근 4주
  [27, "러닝", 30, 2, 4, false],
  [25, "웨이트", 45, 3, 4, false],
  [23, "요가", 40, 1, 3, false],
  [20, "러닝", 35, 3, 4, false],
  [18, "축구", 90, 4, 3, false],
  [16, "걷기", 50, 1, 3, false],
  [13, "러닝", 40, 3, 4, false],
  [11, "배드민턴", 60, 3, 5, false],
  [9, "웨이트", 50, 4, 2, true],
  [7, "요가", 30, 1, 3, false],
  [5, "러닝", 45, 3, 4, false],
  [4, "수영", 40, 3, 4, false],
  [2, "웨이트", 55, 3, 4, false],
  [1, "러닝", 45, 3, 4, false],
  [0, "요가", 30, 1, 5, false],
];

const COACH: Record<number, CoachResponse> = {
  9: {
    feedback:
      "컨디션이 좋지 않은 날 통증이 있었는데도 웨이트를 50분 하셨어요. 오늘은 무리하지 않고 쉬어 가는 게 좋겠습니다. 통증이 계속되면 전문가와 상담해 보세요.",
    plan: { sport: "요가", minutes: 30, intensity: 1 },
    notices: [
      "통증이 계속되면 운동을 쉬고 의사·물리치료사 같은 전문가와 상담해 보세요.",
    ],
  },
  4: {
    feedback:
      "이번 주 벌써 세 번째 운동이에요. 러닝에 이어 수영으로 몸을 풀어 준 점이 좋아요. 컨디션도 안정적이니 이 흐름을 이어 가 보세요.",
    plan: { sport: "웨이트", minutes: 50, intensity: 3 },
    notices: [],
  },
  1: {
    feedback:
      "이틀 사이에 웨이트와 러닝을 연달아 해내셨네요. 강도 3을 꾸준히 유지하고 있어서 몸이 잘 적응하고 있어 보여요. 다음에는 스트레칭을 조금 더 해 보세요.",
    plan: { sport: "요가", minutes: 30, intensity: 1 },
    notices: [],
  },
};

/** 오늘 기준으로 샘플 기록을 만든다. 번호(id)가 고정이라 여러 번 불러와도 겹치지 않는다. */
export function createSampleRecords(now: Date = new Date()): Workout[] {
  return ROWS.map(([ago, sport, minutes, intensity, condition, pain]) => {
    const record: Workout = {
      id: `${SAMPLE_ID_PREFIX}${ago}`,
      date: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - ago,
        19,
        0,
      ).toISOString(),
      minutes,
      sport,
      intensity,
      condition,
      pain,
    };
    if (COACH[ago]) record.coach = COACH[ago];
    if (ago === 4) record.helpful = true;
    return record;
  });
}

/** 샘플 기록을 지금 기록에 합친다. 저장이 막혀 있으면 null. */
export function addSampleRecords(now: Date = new Date()) {
  return mergeRecords(createSampleRecords(now));
}
