"use client";

import { useState, type FormEvent } from "react";
import {
  ErrorText,
  LevelPicker,
  SportLabel,
  fieldBad,
  fieldClass,
  fieldOk,
} from "@/components/form-parts";
import { MAX_SPORT_LENGTH, OTHER_SPORT, SPORT_OPTIONS } from "@/lib/schema";
import SportSelect from "@/components/SportSelect";
import { updateRecord } from "@/lib/storage";
import {
  validateWorkoutForm,
  type FieldErrors,
  type FieldName,
} from "@/lib/validate";
import type { Level, Workout } from "@/types/workout";

// 추가 기능 — 저장한 기록의 시간·종목·강도·컨디션·통증을 고친다. (저장 날짜는 그대로)
// 입력 검사는 기록 입력 폼과 같은 규칙(validateWorkoutForm)을 쓴다.
// 내용이 바뀌면 이전 분석 결과와 "도움이 됐나요?" 응답은 지운다. (고친 기록과 맞지 않기 때문 → 목록의 "다시 시도"로 새로 분석할 수 있다)

const isListed = (sport: string) =>
  (SPORT_OPTIONS as readonly string[]).includes(sport) && sport !== OTHER_SPORT;

export default function RecordEditor({
  record,
  onClose,
}: {
  record: Workout;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(String(record.minutes));
  const [sport, setSport] = useState(
    isListed(record.sport) ? record.sport : OTHER_SPORT,
  );
  const [customSport, setCustomSport] = useState(
    isListed(record.sport) ? "" : record.sport,
  );
  const [intensity, setIntensity] = useState<Level | null>(record.intensity);
  const [condition, setCondition] = useState<Level | null>(record.condition);
  const [pain, setPain] = useState(record.pain);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState(false);

  function clearError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(false);
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
      return;
    }
    setErrors({});
    if (
      result.needsConfirm &&
      !window.confirm(
        `운동 시간이 ${result.value.minutes}분(${(result.value.minutes / 60).toFixed(1)}시간)이에요. 맞나요?`,
      )
    ) {
      return;
    }

    const v = result.value;
    const unchanged =
      v.minutes === record.minutes &&
      v.sport === record.sport &&
      v.intensity === record.intensity &&
      v.condition === record.condition &&
      v.pain === record.pain;
    if (unchanged) {
      onClose();
      return;
    }
    // 내용이 바뀌었으니 이전 분석·응답은 지운다.
    const ok = updateRecord(record.id, {
      minutes: v.minutes,
      sport: v.sport,
      intensity: v.intensity,
      condition: v.condition,
      pain: v.pain,
      coach: undefined,
      helpful: undefined,
    });
    if (ok) onClose();
    else setSaveError(true);
  }

  const sportBad = errors.sport && sport !== OTHER_SPORT;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="기록 수정"
      className="mt-5 flex flex-col gap-6 rounded-2xl border border-ink/10 bg-surface p-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
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
              aria-invalid={errors.minutes ? true : undefined}
              className={`${fieldClass} ${errors.minutes ? fieldBad : fieldOk} mt-2`}
            />
          </label>
          <ErrorText
            id={`edit-${record.id}-minutes`}
            message={errors.minutes}
          />
        </div>
        <div>
          <SportLabel
            id={`edit-${record.id}-sport-label`}
            hasValue={sport !== ""}
            onClear={() => setSport("")}
          />
          <SportSelect
            value={sport}
            onChange={(next) => {
              setSport(next);
              clearError("sport");
            }}
            labelledBy={`edit-${record.id}-sport-label`}
            invalid={Boolean(sportBad)}
          />
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
              className={`${fieldClass} ${errors.sport ? fieldBad : fieldOk} mt-2`}
            />
          )}
          <ErrorText id={`edit-${record.id}-sport`} message={errors.sport} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <LevelPicker
          legend="강도"
          hint="1 가벼움 ~ 5 매우 힘듦"
          name={`edit-${record.id}-intensity`}
          value={intensity}
          error={errors.intensity}
          onChange={(level) => {
            setIntensity(level);
            clearError("intensity");
          }}
          onClear={() => setIntensity(null)}
        />
        <LevelPicker
          legend="컨디션"
          hint="1 나쁨 ~ 5 아주 좋음"
          name={`edit-${record.id}-condition`}
          value={condition}
          error={errors.condition}
          onChange={(level) => {
            setCondition(level);
            clearError("condition");
          }}
          onClear={() => setCondition(null)}
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

      {record.coach && (
        <p className="text-sm text-ink/50">
          내용을 고치면 이전 분석 결과는 지워져요. 목록에서 &quot;다시
          시도&quot;로 새로 분석할 수 있어요.
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="btn-chip h-11 rounded-xl px-6 text-sm font-medium"
        >
          수정 저장
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl bg-ink/5 px-5 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/10"
        >
          취소
        </button>
      </div>
    </form>
  );
}
