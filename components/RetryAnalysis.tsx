"use client";

import { useState } from "react";
import { ANALYSIS_FAILED_MESSAGE, analyzeRecord } from "@/lib/coach-client";

// Design Ref: §7 — 분석에 실패하면 안내 문구와 "다시 시도" 버튼을 보여 준다. 자동 재시도는 하지 않는다. (PRD M2)
// 성공하면 결과가 기록에 저장되므로, 목록은 저장소 알림으로 알아서 다시 그려진다.
export default function RetryAnalysis({
  recordId,
  failed,
  onSuccess,
}: {
  recordId: string;
  /** 방금 실패한 상태인지. false면 "분석 결과가 없어요"만 조용히 보여 준다. */
  failed: boolean;
  onSuccess?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const showError = failed || retryFailed;

  async function handleRetry() {
    if (busy) return;
    setBusy(true);
    setRetryFailed(false);
    const ok = await analyzeRecord(recordId);
    setBusy(false);
    if (ok) onSuccess?.();
    else setRetryFailed(true);
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {showError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {ANALYSIS_FAILED_MESSAGE}
        </p>
      ) : (
        <p className="text-sm text-ink/60">분석 결과가 없어요</p>
      )}
      <button
        type="button"
        onClick={handleRetry}
        disabled={busy}
        className="rounded-xl bg-ink/5 px-4 py-2 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "분석하는 중…" : "다시 시도"}
      </button>
    </div>
  );
}
