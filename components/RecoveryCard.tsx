"use client";

import { useState, useSyncExternalStore } from "react";
import { assessRecovery, type RecoveryLevel } from "@/lib/recovery";
import {
  dateKey,
  getRestSnapshot,
  subscribeRest,
  toggleRestDay,
} from "@/lib/rest";
import { getRecordsSnapshot, subscribeRecords } from "@/lib/storage";
import type { Workout } from "@/types/workout";

// 추가 기능 — 회복 신호 카드. 기록을 읽어 스스로 판단하고, 기록이 없으면 아무것도 보여 주지 않는다.
// "오늘은 쉬었어요" 체크인을 누르면 오늘을 쉬는 날로 남기고(연속 기록은 끊기지 않는다), 다시 누르면 취소된다.
const TONE: Record<
  RecoveryLevel,
  { dot: string; ring: string; label: string }
> = {
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
  const restDays = useSyncExternalStore(
    subscribeRest,
    getRestSnapshot,
    () => null,
  );
  const [error, setError] = useState(false);
  if (records === null || restDays === null) return null;

  const restToday = restDays.includes(dateKey(new Date()));
  const status = assessRecovery(records, new Date(), restToday);
  if (!status) return null;
  const tone = TONE[status.level];

  return (
    <section
      aria-label="회복 신호"
      className={`rounded-[28px] border bg-surface/70 p-5 sm:p-6 ${tone.ring}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className={`size-3 rounded-full ${tone.dot}`}
        />
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
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setError(!toggleRestDay())}
          aria-pressed={restToday}
          className={`h-10 rounded-xl px-4 text-sm font-medium transition-colors ${
            restToday
              ? "bg-leaf/15 text-leaf-text hover:bg-leaf/25"
              : "bg-ink/5 text-ink/80 hover:bg-ink/10"
          }`}
        >
          {restToday ? "😴 오늘 쉬는 날 · 취소" : "😴 오늘은 쉬었어요"}
        </button>
        <p className="text-xs text-ink/40">
          쉬는 날을 남겨도 연속 기록은 끊기지 않아요.
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.
        </p>
      )}
      <p className="mt-3 text-xs text-ink/40">
        최근 기록으로 계산한 참고 안내예요. 의학적 진단이 아니에요.
      </p>
    </section>
  );
}
