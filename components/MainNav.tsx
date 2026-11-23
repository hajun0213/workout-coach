"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      className="flex h-14 items-center gap-1 rounded-2xl bg-pill p-2 text-base backdrop-blur-[14px]"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-xl px-4 py-2 font-medium ${
              active
                ? "btn-chip"
                : "text-ink/60 transition-colors hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
