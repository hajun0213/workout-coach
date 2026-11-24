"use client";

import { useEffect } from "react";

// 키보드 단축키 — "/" 를 누르면 홈의 "한 줄로 입력하기" 칸으로 바로 이동한다.
// 글자를 입력하는 중(입력 칸·선택 목록 등)이거나 Ctrl/Alt/⌘ 를 함께 누른 경우에는 동작하지 않는다.
export default function KeyboardShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.getAttribute("role") === "combobox")
      ) {
        return;
      }
      const field = document.getElementById("quick-text");
      if (!field) return;
      event.preventDefault();
      field.scrollIntoView({ block: "center" });
      field.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}
