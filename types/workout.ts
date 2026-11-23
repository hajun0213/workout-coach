// Design Ref: §4.3 — 운동 기록·AI 요청·AI 응답의 데이터 형태.
// 화면(app/, components/)과 서버(app/api/coach/route.ts)가 함께 가져다 쓰는 약속이다.
// 이 파일은 다른 파일을 가져오지 않는다. (§2.3 의존 규칙)

/** 강도·컨디션 단계 (1~5) */
export type Level = 1 | 2 | 3 | 4 | 5;

/** AI가 제안하는 다음 운동 계획 */
export interface CoachPlan {
  sport: string; // 종목
  minutes: number; // 시간(분)
  intensity: Level; // 강도
}

/** AI 응답 (서버 → 화면). 기록에 함께 저장되어 새로고침 후에도 볼 수 있다. */
export interface CoachResponse {
  feedback: string; // 이번 운동 피드백 (5문장 이내)
  plan: CoachPlan; // 다음 운동 계획 (종목·시간·강도 모두 포함)
  notices: string[]; // 안내 문구들 (3건 미만·오랜만·통증 상담 등)
}

/** 운동 기록 한 건 (브라우저에 저장되는 모양) */
export interface Workout {
  id: string; // 기록 고유 번호 (화면 안에서만 사용, AI에 보내지 않음)
  date: string; // 저장한 시각 (ISO 형식, 예: 2026-11-23T09:30:00.000Z)
  minutes: number; // 운동 시간(분), 정수, 1~1440
  sport: string; // 종목 (목록 값 또는 20자 이하 직접 입력값)
  intensity: Level; // 강도
  condition: Level; // 컨디션
  pain: boolean; // 통증 있음
  coach?: CoachResponse; // AI 분석 결과 (없으면 분석 전이거나 실패)
  helpful?: boolean; // "도움이 됐나요?" 응답 (누르기 전에는 없음)
}

/** AI에 보내는 기록 한 건 — 식별 정보(id·정확한 시각)는 넣지 않는다. */
export interface AiRecord {
  daysAgo: number; // 방금 기록 기준 며칠 전 (방금 기록은 0)
  minutes: number;
  sport: string;
  intensity: Level;
  condition: Level;
  pain: boolean;
}

/** AI 요청 (화면 → 서버): 오래된 것 → 최신 순, 1~7건, 마지막이 방금 기록 */
export interface CoachRequest {
  records: AiRecord[];
  lightStart: boolean; // 오랜만이라 가벼운 계획을 제안해야 하면 true
}

/** 운동 전 오늘의 추천 응답 (서버 → 화면). 기록에는 저장하지 않는다. */
export interface RecommendResponse {
  message: string; // 추천 이유 (3문장 이내)
  plan: CoachPlan; // 오늘 추천하는 운동
  notices: string[]; // 안내 문구들 (강도를 낮춘 이유, 통증 상담 등)
}

/** 주간 리포트의 하루 계획. sport가 null이면 쉬는 날 */
export interface WeeklyPlanDay {
  day: "월" | "화" | "수" | "목" | "금" | "토" | "일";
  sport: string | null;
  minutes: number; // 쉬는 날은 0
  intensity: Level | null; // 쉬는 날은 null
}

/** AI 주간 리포트 (서버 → 화면). 이 브라우저에 저장해 두고 다시 볼 수 있다. */
export interface WeeklyReport {
  summary: string; // 지난주 요약 (4문장 이내)
  tips: string[]; // 실천 팁 (최대 3개)
  plan: WeeklyPlanDay[]; // 다음 주 월~일 계획 (7일)
  notices: string[]; // 안내 문구들
  createdAt: string; // 만든 시각 (ISO) — 서버가 아닌 화면이 붙인다
}
