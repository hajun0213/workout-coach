"use client";

import { useEffect, useState } from "react";
import { MAX_MINUTES } from "@/lib/schema";

// 운동 타이머 — 시작·정지를 누르면 걸린 시간(분)을 운동 시간 칸에 넣어 준다. 서버와 저장소를 쓰지 않는다.
// 탭이 가려져 시계가 느려져도 정확하도록 "시작한 시각"과 지금 시각의 차이로 계산한다.

const pad = (n: number) => String(n).padStart(2, "0");

function format(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function WorkoutTimer({
  onStop,
}: {
  onStop: (minutes: number) => void;
}) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      500,
    );
    return () => window.clearInterval(id);
  }, [startedAt]);

  function start() {
    setSeconds(0);
    setStartedAt(Date.now());
  }

  function stop() {
    if (startedAt === null) return;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    setStartedAt(null);
    setSeconds(0);
    // 1분 미만이어도 최소 1분, 상한은 입력 검사와 같다.
    onStop(Math.min(MAX_MINUTES, Math.max(1, Math.round(elapsed / 60))));
  }

  const running = startedAt !== null;
  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        type="button"
        onClick={running ? stop : start}
        className="h-9 rounded-xl border border-ink/15 px-4 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5"
      >
        {running ? "정지하고 시간 넣기" : "⏱ 타이머 시작"}
      </button>
      {running && (
        <span
          role="timer"
          aria-label="지난 운동 시간"
          className="tabular-nums text-sm text-ink/70"
        >
          {format(seconds)}
        </span>
      )}
    </div>
  );
}
