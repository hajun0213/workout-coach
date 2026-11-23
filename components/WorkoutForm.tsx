"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  MAX_SPORT_LENGTH,
  OTHER_SPORT,
  SPORT_OPTIONS,
} from "@/lib/schema";
import {
  validateWorkoutForm,
  type FieldErrors,
  type FieldName,
} from "@/lib/validate";
import type { Level } from "@/types/workout";

// Design Ref: §3.2, §3.4, §7 — 화면 1의 기록 입력 폼.
// 운동 시간(분) / 종목(목록, 기타는 직접 입력) / 강도 1~5 / 컨디션 1~5 / 통증 체크박스.
// PLAN 4번: 화면과 입력 받기. PLAN 5번: 입력 검사(빈 항목 안내, 0분 이하·소수 불가, 300분 초과 확인, 1440분 초과 불가).
// 저장과 AI 분석 연결은 12번에서 한다.

const LEVELS: Level[] = [1, 2, 3, 4, 5];

const fieldClass =
  "h-12 w-full rounded-xl border bg-white px-4 text-base outline-none transition-colors focus-visible:ring-2";
const fieldOk =
  "border-ink/10 focus:border-ink/40 focus-visible:ring-accent/40";
const fieldBad =
  "border-red-500 focus:border-red-500 focus-visible:ring-red-500/30";

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-medium text-red-600">
      {message}
    </p>
  );
}

// 1~5단계 알약형 선택 버튼 (라디오). 선택하면 어두운 칩 색으로 바뀐다.
function LevelPicker({
  legend,
  hint,
  name,
  value,
  error,
  onChange,
}: {
  legend: string;
  hint: string;
  name: string;
  value: Level | null;
  error?: string;
  onChange: (level: Level) => void;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium text-ink/80">{legend}</legend>
      <div
        role="radiogroup"
        aria-label={legend}
        aria-invalid={error ? true : undefined}
        className="mt-2 flex gap-2"
      >
        {LEVELS.map((level) => (
          <label key={level} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={level}
              checked={value === level}
              onChange={() => onChange(level)}
              className="peer sr-only"
            />
            <span
              className={`flex size-12 items-center justify-center rounded-xl text-base font-medium transition-colors peer-checked:bg-chip peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60 ${
                error ? "bg-red-50 hover:bg-red-100" : "bg-ink/5 hover:bg-ink/10"
              }`}
            >
              {level}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink/50">{hint}</p>
      <ErrorText id={errorId} message={error} />
    </fieldset>
  );
}

export default function WorkoutForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [minutes, setMinutes] = useState("");
  const [sport, setSport] = useState("");
  const [customSport, setCustomSport] = useState("");
  const [intensity, setIntensity] = useState<Level | null>(null);
  const [condition, setCondition] = useState<Level | null>(null);
  const [pain, setPain] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [passed, setPassed] = useState(false);

  // 고친 칸의 오류 안내는 바로 지운다.
  function clearError(field: FieldName) {
    setPassed(false);
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPassed(false);

    const result = validateWorkoutForm({
      minutes,
      sport,
      customSport,
      intensity,
      condition,
      pain,
    });

    if (!result.ok) {
      setErrors(result.errors);
      // 빈 항목이 있으면 첫 번째 문제 칸으로 이동한다.
      requestAnimationFrame(() => {
        const target = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]',
        );
        // 선택 버튼 묶음이면 그 안의 첫 번째 버튼으로 이동한다.
        (target?.matches('[role="radiogroup"]')
          ? target.querySelector<HTMLElement>("input")
          : target
        )?.focus();
      });
      return;
    }

    setErrors({});
    // 300분 초과는 저장 전에 다시 확인한다. (취소하면 입력을 그대로 두고 멈춘다.)
    if (
      result.needsConfirm &&
      !window.confirm(
        `운동 시간이 ${result.value.minutes}분(${(result.value.minutes / 60).toFixed(1)}시간)이에요. 맞나요?`,
      )
    ) {
      return;
    }

    // 임시 동작: 검사를 통과했다는 것만 알려 준다. 저장과 AI 분석은 12번에서 이 자리에 연결한다.
    setPassed(true);
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-8 rounded-[28px] border border-ink/10 bg-white/70 p-8 shadow-[0_40px_70px_rgba(40,60,110,0.12),0_6px_14px_rgba(20,30,60,0.08)]"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block">
            <span className="text-sm font-medium text-ink/80">
              운동 시간(분)
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={minutes}
              onChange={(event) => {
                setMinutes(event.target.value);
                clearError("minutes");
              }}
              placeholder="예: 40"
              aria-invalid={errors.minutes ? true : undefined}
              aria-describedby={errors.minutes ? "minutes-error" : undefined}
              className={`${fieldClass} ${errors.minutes ? fieldBad : fieldOk} mt-2`}
            />
          </label>
          <ErrorText id="minutes-error" message={errors.minutes} />
        </div>

        <div>
          <label className="block">
            <span className="text-sm font-medium text-ink/80">종목</span>
            <select
              value={sport}
              onChange={(event) => {
                setSport(event.target.value);
                clearError("sport");
              }}
              aria-invalid={errors.sport && sport !== OTHER_SPORT ? true : undefined}
              aria-describedby={errors.sport ? "sport-error" : undefined}
              className={`${fieldClass} ${errors.sport && sport !== OTHER_SPORT ? fieldBad : fieldOk} mt-2`}
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
              maxLength={MAX_SPORT_LENGTH}
              value={customSport}
              onChange={(event) => {
                setCustomSport(event.target.value);
                clearError("sport");
              }}
              placeholder={`종목을 직접 입력 (${MAX_SPORT_LENGTH}자 이하)`}
              aria-label="종목 직접 입력"
              aria-invalid={errors.sport ? true : undefined}
              aria-describedby={errors.sport ? "sport-error" : undefined}
              className={`${fieldClass} ${errors.sport ? fieldBad : fieldOk} mt-2`}
            />
          )}
          <ErrorText id="sport-error" message={errors.sport} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <LevelPicker
          legend="강도"
          hint="1 가벼움 ~ 5 매우 힘듦"
          name="intensity"
          value={intensity}
          error={errors.intensity}
          onChange={(level) => {
            setIntensity(level);
            clearError("intensity");
          }}
        />
        <LevelPicker
          legend="컨디션"
          hint="1 나쁨 ~ 5 아주 좋음"
          name="condition"
          value={condition}
          error={errors.condition}
          onChange={(level) => {
            setCondition(level);
            clearError("condition");
          }}
        />
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={pain}
          onChange={(event) => {
            setPain(event.target.checked);
            setPassed(false);
          }}
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
        {passed && (
          <p role="status" className="text-sm text-ink/60">
            입력 검사를 통과했어요. 저장과 AI 분석은 다음 작업에서 이 버튼에
            연결돼요.
          </p>
        )}
      </div>
    </form>
  );
}
