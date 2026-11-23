"use client";

import { useState, type FormEvent } from "react";
import type { Level } from "@/types/workout";

// Design Ref: §3.2, §3.4 — 화면 1의 기록 입력 폼.
// 운동 시간(분) / 종목(목록, 기타는 직접 입력) / 강도 1~5 / 컨디션 1~5 / 통증 체크박스.
// 이번 작업(PLAN 4번)은 화면과 입력 받기까지만 만든다.
//   · 입력 검사(빈 항목·0분 이하·300분 초과 확인)는 5번에서 붙인다. 지금은 브라우저 기본 검사(required, min, max, step)만 쓴다.
//   · 저장과 AI 분석 연결은 12번에서 한다.

// 종목 목록 (PRD M1). "기타"를 고르면 20자 이하로 직접 입력한다.
const SPORT_OPTIONS = [
  "러닝",
  "걷기",
  "웨이트",
  "요가",
  "수영",
  "자전거",
  "기타",
] as const;
const OTHER_SPORT = "기타";
const MAX_CUSTOM_SPORT_LENGTH = 20;
const LEVELS: Level[] = [1, 2, 3, 4, 5];

const fieldClass =
  "h-12 w-full rounded-xl border border-ink/10 bg-white px-4 text-base outline-none transition-colors focus:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent/40";

// 1~5단계 알약형 선택 버튼 (라디오). 선택하면 어두운 칩 색으로 바뀐다.
function LevelPicker({
  legend,
  hint,
  name,
  value,
  onChange,
}: {
  legend: string;
  hint: string;
  name: string;
  value: Level | null;
  onChange: (level: Level) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink/80">{legend}</legend>
      <div className="mt-2 flex gap-2">
        {LEVELS.map((level) => (
          <label key={level} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={level}
              checked={value === level}
              onChange={() => onChange(level)}
              required
              className="peer sr-only"
            />
            <span className="flex size-12 items-center justify-center rounded-xl bg-ink/5 text-base font-medium transition-colors hover:bg-ink/10 peer-checked:bg-chip peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60">
              {level}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink/50">{hint}</p>
    </fieldset>
  );
}

export default function WorkoutForm() {
  const [minutes, setMinutes] = useState("");
  const [sport, setSport] = useState("");
  const [customSport, setCustomSport] = useState("");
  const [intensity, setIntensity] = useState<Level | null>(null);
  const [condition, setCondition] = useState<Level | null>(null);
  const [pain, setPain] = useState(false);
  const [received, setReceived] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 임시 동작: 입력이 모두 채워졌다는 것만 알려 준다. 검사(5번)·저장·AI 분석(12번)을 이 자리에 연결한다.
    setReceived(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8 rounded-[28px] border border-ink/10 bg-white/70 p-8 shadow-[0_40px_70px_rgba(40,60,110,0.12),0_6px_14px_rgba(20,30,60,0.08)]"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink/80">운동 시간(분)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            step={1}
            required
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            placeholder="예: 40"
            className={`${fieldClass} mt-2`}
          />
        </label>

        <div>
          <label className="block">
            <span className="text-sm font-medium text-ink/80">종목</span>
            <select
              required
              value={sport}
              onChange={(event) => setSport(event.target.value)}
              className={`${fieldClass} mt-2`}
            >
              <option value="" disabled>
                종목을 선택하세요
              </option>
              {SPORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {sport === OTHER_SPORT && (
            <input
              type="text"
              required
              maxLength={MAX_CUSTOM_SPORT_LENGTH}
              value={customSport}
              onChange={(event) => setCustomSport(event.target.value)}
              placeholder={`종목을 직접 입력 (${MAX_CUSTOM_SPORT_LENGTH}자 이하)`}
              aria-label="종목 직접 입력"
              className={`${fieldClass} mt-2`}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <LevelPicker
          legend="강도"
          hint="1 가벼움 ~ 5 매우 힘듦"
          name="intensity"
          value={intensity}
          onChange={setIntensity}
        />
        <LevelPicker
          legend="컨디션"
          hint="1 나쁨 ~ 5 아주 좋음"
          name="condition"
          value={condition}
          onChange={setCondition}
        />
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={pain}
          onChange={(event) => setPain(event.target.checked)}
          className="size-5 accent-accent"
        />
        <span className="text-base">통증 있음</span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="btn-chip h-12 rounded-xl px-7 text-base font-medium"
        >
          저장하고 코칭 받기
        </button>
        {received && (
          <p role="status" className="text-sm text-ink/60">
            입력을 받았어요. 입력 검사·저장·AI 분석은 다음 작업에서 이 버튼에
            연결돼요.
          </p>
        )}
      </div>
    </form>
  );
}
