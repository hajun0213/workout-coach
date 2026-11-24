import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import InstallPrompt from "@/components/InstallPrompt";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import MainNav from "@/components/MainNav";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Plan SC: S6 — 제목·언어를 정리하고 lint·build가 통과하는 기본 틀
export const viewport: Viewport = {
  themeColor: "#12151b",
};

export const metadata: Metadata = {
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "운동 코치", statusBarStyle: "default" },
  title: "오늘의 운동 코치",
  description:
    "운동 기록을 저장하면 AI가 피드백과 다음 운동 계획을 알려 주는 개인 운동 코칭 서비스",
};

// Design Ref: §3.1, §3.5 — 공통 틀. 양 끝에 떠 있는 알약형 헤더 2개(로고 / 메뉴) + 본문. 헤더는 화면을 내려도 맨 위에 고정된다.
// PC 웹 화면(본문 최대 너비 max-w-5xl = 약 1024px)을 기준으로 만들고, 휴대폰(sm 미만)에서는 여백·헤더 크기를 줄인다. (§1.1, N3)
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${interTight.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* 저장된 화면 색(밝게/어둡게)을 첫 화면이 그려지기 전에 적용한다. 고정된 한 줄 스크립트다. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/* 키보드·화면 읽기 프로그램 사용자가 메뉴를 건너뛰고 본문으로 바로 가는 링크. Tab 키를 처음 누르면 나타난다. */}
        <a
          href="#main"
          className="fixed -top-24 left-4 z-50 rounded-xl bg-chip px-4 py-2 text-sm font-medium text-white shadow-lg focus:top-4"
        >
          본문으로 건너뛰기
        </a>
        <KeyboardShortcuts />
        <header className="pointer-events-none sticky top-0 z-40">
          <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <Link
              href="/"
              aria-label="오늘의 운동 코치 홈"
              className="pointer-events-auto flex h-12 items-center gap-1.5 whitespace-nowrap rounded-2xl bg-pill px-3 shadow-[0_8px_24px_rgba(40,60,110,0.12)] backdrop-blur-[14px] sm:h-14 sm:gap-2 sm:px-5"
            >
              <span className="text-sm font-semibold tracking-tight sm:text-lg">
                오늘의 운동 코치
              </span>
            </Link>
            <MainNav />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full outline-none max-w-5xl flex-1 px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
          {children}
        </main>
        {/* Design Ref: §3.1 — 모든 화면 아래에 항상 보이는 안내 문구 (PRD §7: 기록 보관 안내, AI 조언 안내) */}
        <footer className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
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
              AI 조언은 참고용이며 의학적 진단이 아닙니다.{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                개인정보 안내
              </Link>
            </p>
            <InstallPrompt />
          </div>
        </footer>
      </body>
    </html>
  );
}
