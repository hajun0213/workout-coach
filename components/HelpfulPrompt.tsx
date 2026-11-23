"use client";

import { useState } from "react";
import { updateRecord } from "@/lib/storage";

// Design Ref: §3.3 — "도움이 됐나요? 예/아니오". 누르면 기록에 저장하고, 한 번 누르면 두 버튼 모두 비활성화한다. (PRD M2)
// 짙은 결과 카드 안에서 쓰므로 색은 카드(어두운 바탕) 기준이다.
export default function HelpfulPrompt({
  recordId,
  helpful,
}: {
  recordId: string;
  /** 이미 저장된 응답 (없으면 아직 안 누른 것) */
  helpful?: boolean;
}) {
  const [error, setError] = useState(false);
  const answered = helpful !== undefined;

  function answer(value: boolean) {
    if (answered) return;
    setError(!updateRecord(recordId, { helpful: value }));
  }

  const button = (label: string, value: boolean) => {
    const selected = helpful === value;
    return (
      <button
        type="button"
        onClick={() => answer(value)}
        disabled={answered}
        aria-pressed={answered ? selected : undefined}
        className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-default ${
          selected
            ? "bg-accent text-white"
            : answered
              ? "bg-white/5 text-white/30"
              : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
      <span className="text-sm text-white/60">도움이 됐나요?</span>
      {button("예", true)}
      {button("아니오", false)}
      {answered && <span className="text-sm text-white/50">의견 고마워요</span>}
      {error && (
        <span role="alert" className="text-sm text-red-300">
          저장하지 못했어요. 다시 눌러 주세요.
        </span>
      )}
    </div>
  );
}
