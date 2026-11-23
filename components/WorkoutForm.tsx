"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import CoachPanel from "@/components/CoachPanel";
import QuickInput from "@/components/QuickInput";
import SportSelect from "@/components/SportSelect";
import RetryAnalysis from "@/components/RetryAnalysis";
import type { QuickFill } from "@/lib/quick-input";
import { analyzeRecord } from "@/lib/coach-client";
import { addRecord, getRecordsSnapshot, subscribeRecords } from "@/lib/storage";
import { MAX_SPORT_LENGTH, OTHER_SPORT, SPORT_OPTIONS } from "@/lib/schema";
import {
  validateWorkoutForm,
  type FieldErrors,
  type FieldName,
} from "@/lib/validate";
import {
  ErrorText,
  LevelPicker,
  SportLabel,
  fieldBad,
  fieldClass,
  fieldOk,
} from "@/components/form-parts";
import type { Level, Workout } from "@/types/workout";

// Design Ref: §3.2, §3.4, §7 — 화면 1의 기록 입력 폼.
// 운동 시간(분) / 종목(목록, 기타는 직접 입력) / 강도 1~5 / 컨디션 1~5 / 통증 체크박스.
// PLAN 4번: 화면과 입력 받기. PLAN 5번: 입력 검사(빈 항목 안내, 0분 이하·소수 불가, 300분 초과 확인, 1440분 초과 불가).
// PLAN 12번: 검사를 통과하면 기록을 저장 → AI 분석 요청 → 결과를 기록에 저장하고 아래에 보여 준다.
// (실패하면 "다시 시도" 버튼 - 13번, "도움이 됐나요?"는 14번)

export default function WorkoutForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [minutes, setMinutes] = useState("");
  const [sport, setSport] = useState("");
  const [customSport, setCustomSport] = useState("");
  const [intensity, setIntensity] = useState<Level | null>(null);
  const [condition, setCondition] = useState<Level | null>(null);
  const [pain, setPain] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  // 저장·분석 진행 상태. 분석 중에는 버튼을 막아 같은 기록을 두 번 보내지 않게 한다.
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done" | "failed">(
    "idle",
  );
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 결과는 저장된 기록에서 읽는다. (새로고침해도 기록 목록에서 같은 결과를 볼 수 있다)
  const records = useSyncExternalStore<Workout[] | null>(
    subscribeRecords,
    getRecordsSnapshot,
    () => null,
  );
  const savedRecord = records?.find((record) => record.id === savedId);

  // 고친 칸의 오류 안내는 바로 지운다.
  function clearError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  // AI가 읽어 낸 값을 입력 칸에 넣는다. 읽지 못한 항목(null)은 건드리지 않는다.
  function applyQuickFill(fill: QuickFill) {
    setErrors({});
    if (fill.minutes !== null) setMinutes(String(fill.minutes));
    if (fill.sport !== null) {
      const listed =
        (SPORT_OPTIONS as readonly string[]).includes(fill.sport) &&
        fill.sport !== OTHER_SPORT;
      setSport(listed ? fill.sport : OTHER_SPORT);
      setCustomSport(listed ? "" : fill.sport);
    }
    if (fill.intensity !== null) setIntensity(fill.intensity);
    if (fill.condition !== null) setCondition(fill.condition);
    if (fill.pain !== null) setPain(fill.pain);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "analyzing") return;
    setSaveError(null);

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

    // 1) 기록 저장 (저장 시각 = 지금). 저장이 안 되면 분석하지 않고 알려 준다.
    const record: Workout = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ...result.value,
    };
    if (!addRecord(record)) {
      setSaveError("저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.");
      return;
    }
    setSavedId(record.id);
    // 다음 기록을 바로 쓸 수 있게 입력을 비운다.
    setMinutes("");
    setSport("");
    setCustomSport("");
    setIntensity(null);
    setCondition(null);
    setPain(false);

    // 2) AI 분석 → 결과를 기록에 저장. 실패해도 기록은 남는다.
    setPhase("analyzing");
    void analyzeRecord(record.id).then((ok) =>
      setPhase(ok ? "done" : "failed"),
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-8 rounded-[28px] border border-ink/10 bg-white/70 p-5 sm:p-8 shadow-[0_40px_70px_rgba(40,60,110,0.12),0_6px_14px_rgba(20,30,60,0.08)]"
    >
      <QuickInput onFill={applyQuickFill} />

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
          <SportLabel
            id="sport-label"
            hasValue={sport !== ""}
            onClear={() => setSport("")}
          />
          <SportSelect
            value={sport}
            onChange={(next) => {
              setSport(next);
              clearError("sport");
            }}
            labelledBy="sport-label"
            invalid={Boolean(errors.sport) && sport !== OTHER_SPORT}
            describedBy={errors.sport ? "sport-error" : undefined}
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
          onClear={() => setIntensity(null)}
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
          onClear={() => setCondition(null)}
        />
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={pain}
          onChange={(event) => {
            setPain(event.target.checked);
          }}
          className="size-5 accent-accent"
        />
        <span className="text-base">통증 있음</span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={phase === "analyzing"}
          className="btn-chip h-12 rounded-xl px-7 text-base font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "analyzing" ? "분석하는 중…" : "저장하고 코칭 받기"}
        </button>
        {phase === "analyzing" && (
          <p role="status" className="text-sm text-ink/60">
            기록을 저장했어요. AI가 분석하고 있어요. (최대 10초)
          </p>
        )}
      </div>

      {saveError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {saveError}
        </p>
      )}

      {phase === "failed" && savedId && (
        <div>
          <RetryAnalysis
            recordId={savedId}
            failed
            onSuccess={() => setPhase("done")}
          />
          <p className="mt-2 text-sm text-ink/50">기록은 저장됐어요.</p>
        </div>
      )}

      {phase === "done" && savedRecord?.coach && (
        <section aria-label="분석 결과" className="rise-in">
          <CoachPanel record={{ ...savedRecord, coach: savedRecord.coach }} />
          <Link
            href="/records"
            className="mt-4 inline-block text-sm font-medium text-ink/60 underline-offset-4 hover:text-ink hover:underline"
          >
            기록 목록에서 보기
          </Link>
        </section>
      )}
    </form>
  );
}
