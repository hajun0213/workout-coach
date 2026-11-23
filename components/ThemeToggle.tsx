"use client";

import { useSyncExternalStore } from "react";
import {
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
  type Theme,
} from "@/lib/theme";

// 화면 색 전환 버튼 (밝게 ↔ 어둡게). 서버 화면에서는 밝게로 그리고, 브라우저에서 실제 설정을 읽은 뒤 바뀐다.
export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    getThemeSnapshot,
    () => "light",
  );
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "밝은 화면으로 바꾸기" : "어두운 화면으로 바꾸기"}
      title={dark ? "밝은 화면" : "어두운 화면"}
      className="flex size-8 shrink-0 items-center justify-center rounded-xl text-base text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink sm:size-10"
    >
      <span aria-hidden="true">{dark ? "☀️" : "🌙"}</span>
    </button>
  );
}
