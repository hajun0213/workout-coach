"use client";

import { useSyncExternalStore } from "react";
import { assessRecovery, type RecoveryLevel } from "@/lib/recovery";
import { getRecordsSnapshot, subscribeRecords } from "@/lib/storage";
import type { Workout } from "@/types/workout";

// 추가 기능 — 회복 신호 카드. 기록을 읽어 스스로 판단하고, 기록이 없으면 아무것도 보여 주지 않는다.
const TONE: Record<RecoveryLevel, { dot: string; ring: string; label: string }> = {
  good: { dot: "bg-leaf", ring: "border-leaf/40", label: "양호" },
  caution: { dot: "bg-accent", ring: "border-accent/40", label: "주의" },
  rest: { dot: "bg-red-500", ring: "border-red-500/40", label: "휴식" },
};

export default function RecoveryCard() {
  const records = useSyncExternalStore<Workout[] | null>(
    subscribeRecords,
    getRecordsSnapshot,
    () => null,
  );
  const status = records ? assessRecovery(records) : null;
  if (!status) return null;
  const tone = TONE[status.level];

  return (
    <section
      aria-label="회복 신호"
      className={`rounded-[28px] border bg-white/70 p-5 sm:p-6 ${tone.ring}`}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={`size-3 rounded-full ${tone.dot}`} />
        <h2 className="text-lg font-semibold tracking-tight">{status.title}</h2>
        <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-medium text-ink/60">
          회복 신호 · {tone.label}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm leading-relaxed text-ink/70">
        {status.reasons.map((reason) => (
          <li key={reason}>· {reason}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink/40">
        최근 기록으로 계산한 참고 안내예요. 의학적 진단이 아니에요.
      </p>
    </section>
  );
}
