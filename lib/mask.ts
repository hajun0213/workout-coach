// 개인정보 가리기 — AI로 보내기 전에 글자 속 이메일·전화번호·주민등록번호·카드번호 모양을 가린다.
// 서버와 화면이 함께 쓴다. (이름 같은 것은 알아낼 수 없어서 화면 안내로 막는다)

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// +82 10-1234-5678, +82 (0)10 1234 5678 같은 국제 번호
const PHONE_INTL = /\+82[-.\s]?(?:\(0\)|0)?\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g;
// 카드번호: 숫자 16자리(4자리씩 끊어 쓴 것 포함)
const CARD = /(?<!\d)(?:\d{4}[-\s]?){3}\d{4}(?!\d)/g;
// 주민등록번호: 앞 6자리 + 뒤 7자리(첫 자리 1~4)
const RRN = /(?<!\d)\d{6}[-\s]?[1-4]\d{6}(?!\d)/g;
const PHONE = /(?<!\d)0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g;

/** 문장 속 이메일·전화번호·주민등록번호·카드번호 모양을 가린다. */
export function maskPersonalInfo(text: string): string {
  return text
    .replace(EMAIL, "[이메일]")
    .replace(RRN, "[번호]")
    .replace(CARD, "[번호]")
    .replace(PHONE_INTL, "[번호]")
    .replace(PHONE, "[번호]");
}
