"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

// Design Ref: §3.1, §3.5 — 오른쪽 알약형 메뉴. 현재 화면은 어두운 칩으로 표시한다.
const ITEMS = [
  { href: "/", label: "오늘 기록" },
  { href: "/records", label: "기록 목록" },
] as const;

export default function MainNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주 메뉴"
      className="pointer-events-auto flex h-12 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-2xl bg-pill p-1 text-[13px] sm:gap-1 shadow-[0_8px_24px_rgba(40,60,110,0.12)] backdrop-blur-[14px] sm:h-14 sm:p-2 sm:text-base"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-xl px-2.5 py-2 font-medium sm:px-4 ${
              active
                ? "btn-chip"
                : "text-ink/60 transition-colors hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <ThemeToggle />
    </nav>
  );
}
