import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import Link from "next/link";
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
// 하단 안내 문구는 PLAN 작업 7번에서 추가한다.
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
            <nav
              aria-label="주 메뉴"
              className="flex h-14 items-center gap-1 rounded-2xl bg-pill p-2 text-base backdrop-blur-[14px]"
            >
              {/* 지금 화면이 "오늘 기록"뿐이라 현재 위치 표시를 고정해 둔다. 화면이 늘면 현재 주소에 따라 바뀌게 한다. */}
              <Link
                href="/"
                aria-current="page"
                className="btn-chip rounded-xl px-4 py-2 font-medium"
              >
                오늘 기록
              </Link>
              {/* 기록 목록 화면(/records)은 작업 6번에서 만든다. 그때까지는 링크 없이 표시만 한다. */}
              <span aria-disabled="true" className="px-4 py-2 text-ink/40">
                기록 목록
              </span>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}
