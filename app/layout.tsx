import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// Plan SC: S6 — 제목·언어를 정리하고 lint·build가 통과하는 기본 틀
export const metadata: Metadata = {
  title: "오늘의 운동 코치",
  description:
    "운동 기록을 저장하면 AI가 피드백과 다음 운동 계획을 알려 주는 개인 운동 코칭 서비스",
};

// Design Ref: §3.1 — 공통 틀(상단 메뉴 + 본문). 휴대폰 너비(max-w-md) 기준으로 먼저 만든다. (§1.1 모바일 우선)
// 하단 안내 문구는 PLAN 작업 7번에서 추가한다.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-foreground/10">
          <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-bold">
              오늘의 운동 코치
            </Link>
            <nav aria-label="주 메뉴" className="flex gap-4 text-sm">
              <Link href="/" className="font-medium">
                오늘 기록
              </Link>
              {/* 기록 목록 화면(/records)은 작업 6번에서 만든다. 그때까지는 링크 없이 표시만 한다. */}
              <span aria-disabled="true" className="text-foreground/40">
                기록 목록
              </span>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
