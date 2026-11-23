"use client";

import { useEffect, useState } from "react";

// AI를 기다리는 동안 보여 주는 로딩 연출 — 단계 문구가 차례로 바뀌고, 결과 카드가 들어올 자리에 회색 뼈대(스켈레톤)가 깜빡인다.
// 단계는 실제 진행 상황이 아니라 "지금 이런 일을 하는 중"이라는 안내라서, 마지막 단계에서 결과가 올 때까지 머문다.
// 움직임 줄이기 설정을 켠 사용자에게는 깜빡임 없이 문구만 보여 준다.
export default function AiLoading({
  steps,
  lines = 3,
}: {
  steps: readonly string[];
  /** 뼈대 줄 수 */
  lines?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => Math.min(i + 1, steps.length - 1)),
      1800,
    );
    return () => clearInterval(id);
  }, [steps.length]);

  const widths = ["w-full", "w-11/12", "w-4/6", "w-5/6", "w-3/5"];

  return (
    <div className="mt-4 rounded-2xl bg-ink/5 p-4 sm:p-5">
      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-sm font-medium text-ink/70"
      >
        <span
          aria-hidden="true"
          className="inline-block size-2 rounded-full bg-accent motion-safe:animate-ping"
        />
        {steps[index]}
        <span className="text-ink/40">
          ({index + 1}/{steps.length})
        </span>
      </p>
      <div aria-hidden="true" className="mt-3 space-y-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`h-3 rounded-full bg-ink/10 motion-safe:animate-pulse ${widths[i % widths.length]}`}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
