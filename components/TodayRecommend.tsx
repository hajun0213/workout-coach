"use client";

import { useState } from "react";
import AiLoading from "@/components/AiLoading";
import { LevelPicker } from "@/components/form-parts";
import { normalizeParse, type QuickFill } from "@/lib/quick-input";
import { fetchRecommendation } from "@/lib/recommend-client";
import { sportIcon } from "@/lib/sport-icons";
import type { Level, RecommendResponse } from "@/types/workout";

// 운동 전 오늘의 추천 — 오늘 컨디션·통증·쓸 수 있는 시간을 고르면 최근 기록을 바탕으로 AI가 오늘 할 운동을 추천한다.
// 추천을 받은 뒤 "이 계획으로 기록 시작"을 누르면 아래 입력 칸에 종목·시간·강도가 미리 들어간다. (운동 후 고쳐서 저장)
const TIME_CHOICES = [20, 30, 45, 60, 90];

export default function TodayRecommend({
  onApply,
}: {
  onApply: (fill: QuickFill) => void;
}) {
  const [condition, setCondition] = useState<Level | null>(null);
  const [pain, setPain] = useState(false);
  const [available, setAvailable] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [needCondition, setNeedCondition] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);

  async function handleRecommend() {
    if (busy) return;
    if (condition === null) {
      setNeedCondition(true);
      return;
    }
    setNeedCondition(false);
    setBusy(true);
    setFailed(false);
    setResult(null);
    const response = await fetchRecommendation({
      condition,
      pain,
      availableMinutes: available,
    });
    setBusy(false);
    if (response) setResult(response);
    else setFailed(true);
  }

  function handleApply() {
    if (!result || condition === null) return;
    const fill = normalizeParse({
      minutes: result.plan.minutes,
      sport: result.plan.sport,
      intensity: result.plan.intensity,
      condition: null,
      pain: null,
    });
    onApply({ ...fill, condition, pain });
  }

  return (
    <details className="group rounded-2xl bg-ink/5 p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-medium text-ink/80">
        운동 전이에요?{" "}
        <span className="text-ink/50">오늘의 운동 추천받기 (AI)</span>
      </summary>

      <div className="mt-4 space-y-5">
        <LevelPicker
          legend="오늘 컨디션"
          hint="1 나쁨 ~ 5 아주 좋음"
          name="today-condition"
          value={condition}
          error={needCondition ? "오늘 컨디션을 선택해 주세요" : undefined}
          onChange={(level) => {
            setCondition(level);
            setNeedCondition(false);
          }}
          onClear={() => setCondition(null)}
        />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={pain}
              onChange={(event) => setPain(event.target.checked)}
              className="size-5 accent-accent"
            />
            <span className="text-sm">오늘 통증 있음</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            쓸 수 있는 시간
            <select
              value={available ?? ""}
              onChange={(event) =>
                setAvailable(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <option value="">제한 없음</option>
              {TIME_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {m}분 이내
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRecommend}
            disabled={busy}
            className="h-10 rounded-xl bg-chip px-5 text-sm font-medium text-white transition-colors hover:bg-chip-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "추천하는 중…" : "오늘의 운동 추천받기"}
          </button>
          <p className="text-xs text-ink/40">
            최근 기록(날짜·시간·종목·강도 등)만 AI로 전송돼요.
          </p>
        </div>

        {busy && (
          <AiLoading
            lines={2}
            steps={[
              "오늘 컨디션을 확인하는 중",
              "최근 기록을 살펴보는 중",
              "오늘의 운동을 고르는 중",
            ]}
          />
        )}

        {failed && (
          <p role="alert" className="text-sm font-medium text-red-600">
            추천에 실패했습니다. 다시 시도해 주세요.
          </p>
        )}

        {result && (
          <div className="rise-in rounded-2xl bg-panel p-5 text-white">
            <p className="text-base leading-relaxed text-white/90">
              {result.message}
            </p>
            <p className="mt-4 text-sm text-white/50">오늘의 추천</p>
            <p className="mt-1 text-lg font-semibold">
              <span aria-hidden="true">{sportIcon(result.plan.sport)}</span>{" "}
              <span className="text-accent">{result.plan.sport}</span>{" "}
              {result.plan.minutes}분 · 강도 {result.plan.intensity}
            </p>
            {result.notices.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-white/60">
                {result.notices.map((notice) => (
                  <li key={notice}>· {notice}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={handleApply}
              className="mt-4 h-10 rounded-xl bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              이 계획으로 기록 시작
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
