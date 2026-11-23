// 종목 이름 옆에 보여 주는 아이콘(이모지). 종목 목록(SPORT_OPTIONS)과 같은 이름을 쓴다.
// 별도 이미지 파일이나 아이콘 도구 없이 글자로 표시해서 용량이 늘지 않는다.
const SPORT_ICONS: Record<string, string> = {
  러닝: "🏃",
  걷기: "🚶",
  웨이트: "🏋️",
  요가: "🧘",
  수영: "🏊",
  자전거: "🚴",
  축구: "⚽",
  농구: "🏀",
  배드민턴: "🏸",
  테니스: "🎾",
  탁구: "🏓",
  야구: "⚾",
  배구: "🏐",
  골프: "⛳",
  등산: "🥾",
  필라테스: "🤸",
  복싱: "🥊",
  기타: "✏️",
};

/** 직접 입력한 종목처럼 목록에 없는 이름에 쓰는 기본 아이콘 */
export const DEFAULT_SPORT_ICON = "🏅";

/** 종목 이름에 맞는 아이콘. 목록에 없으면 기본 아이콘. */
export function sportIcon(sport: string): string {
  return Object.prototype.hasOwnProperty.call(SPORT_ICONS, sport)
    ? SPORT_ICONS[sport]
    : DEFAULT_SPORT_ICON;
}
