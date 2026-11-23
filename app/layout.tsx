import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import Link from "next/link";
import MainNav from "@/components/MainNav";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Plan SC: S6 — 제목·언어를 정리하고 lint·build가 통과하는 기본 틀
export const metadata: Metadata = {
  title: "오늘의 운동 코치",
  description:
    "운동 기록을 저장하면 AI가 피드백과 다음 운동 계획을 알려 주는 개인 운동 코칭 서비스",
};

// Design Ref: §3.1, §3.5 — 공통 틀. 양 끝에 떠 있는 알약형 헤더 2개(로고 / 메뉴) + 본문.
// PC 웹 화면(본문 최대 너비 max-w-5xl = 약 1024px)을 기준으로 만든다. (§1.1)
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${interTight.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="relative z-20">
          <div className="mx-auto flex w-full max-w-5xl items-start justify-between px-6 pt-6">
            <Link
              href="/"
              aria-label="오늘의 운동 코치 홈"
              className="flex h-14 items-center gap-2 rounded-2xl bg-pill px-5 backdrop-blur-[14px]"
            >
              <span className="text-lg font-semibold tracking-tight">
                오늘의 운동 코치
              </span>
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent"
              />
            </Link>
            <MainNav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-20">
          {children}
        </main>
        {/* Design Ref: §3.1 — 모든 화면 아래에 항상 보이는 안내 문구 (PRD §7: 기록 보관 안내, AI 조언 안내) */}
        <footer className="mx-auto w-full max-w-5xl px-6 pb-10">
          <div className="rounded-2xl bg-pill px-6 py-4 text-sm leading-relaxed text-ink/60 backdrop-blur-[14px]">
            <p className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
              />
              기록은 이 기기·브라우저에만 저장돼요. 브라우저 데이터를 지우거나
              다른 기기로 접속하면 기록이 보이지 않아요.
            </p>
            <p className="mt-1 flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
              />
              AI 조언은 참고용이며 의학적 진단이 아닙니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
