import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 안내 · 오늘의 운동 코치",
};

// 개인정보 안내 — 어떤 정보가 어디에 저장되고 어디로 전송되는지 짧게 알린다. (PRD §7)
const sections: { title: string; items: string[] }[] = [
  {
    title: "내 기기에 저장되는 것",
    items: [
      "운동 기록(날짜·시간·종목·강도·컨디션·통증 여부), AI 분석 결과, 주간 목표, 루틴, 쉬는 날 표시는 이 기기의 브라우저에만 저장돼요.",
      "회원가입과 로그인이 없고, 서비스 서버에 기록을 저장하는 데이터베이스도 없어요.",
      "브라우저 데이터를 지우거나 다른 기기로 접속하면 기록이 보이지 않아요. 기록 화면의 백업 기능으로 파일에 보관할 수 있어요.",
    ],
  },
  {
    title: "AI(OpenAI)로 전송되는 것",
    items: [
      "기록을 저장해 코칭을 받을 때, 오늘의 추천을 받을 때, 주간 리포트를 만들 때 최근 기록(며칠 전인지·시간·종목·강도·컨디션·통증 여부)이 AI 서비스(OpenAI)로 전송돼요.",
      "한 줄 빠른 입력을 쓰면 입력한 문장이 전송돼요. 이메일·전화번호·주민등록번호·카드번호 모양은 보내기 전에 가리지만, 이름 같은 정보는 가릴 수 없으니 쓰지 마세요.",
      "통증 여부는 건강과 관련된 정보예요. 전송을 원하지 않으면 코칭·추천·리포트·빠른 입력 기능을 쓰지 않고 기록만 저장해도 돼요.",
      "전송은 서비스 서버를 거쳐 이루어지고, 서버는 전송 내용을 저장하지 않아요. OpenAI에는 저장하지 말라고 요청하지만, OpenAI가 오남용 방지를 위해 일정 기간 보관할 수 있어요. OpenAI 서버는 해외에 있어요.",
    ],
  },
  {
    title: "알아 두세요",
    items: [
      "AI 조언은 참고용이며 의학적 진단이 아니에요. 통증이 계속되면 전문가와 상담하세요.",
      "이 서비스는 기록을 광고나 분석 목적으로 수집하지 않아요.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <section>
      <h1 className="rise-in text-5xl font-medium leading-[1.05] tracking-[-0.03em] sm:text-6xl">
        개인정보 안내
      </h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-relaxed text-ink/60">
        어떤 정보가 어디에 저장되고, 어디로 전송되는지 알려 드려요.
      </p>
      <div className="rise-in rise-in-3 mt-12 flex max-w-2xl flex-col gap-6">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 sm:p-8"
          >
            <h2 className="text-xl font-medium">{section.title}</h2>
            <ul className="mt-4 flex list-disc flex-col gap-3 pl-5 text-base leading-relaxed text-ink/80">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
