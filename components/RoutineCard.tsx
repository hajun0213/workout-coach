"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  LevelPicker,
  SportLabel,
  fieldClass,
  fieldOk,
} from "@/components/form-parts";
import SportSelect from "@/components/SportSelect";
import {
  DAY_NAMES,
  MAX_ROUTINES,
  addRoutine,
  deleteRoutine,
  formatDays,
  getRoutinesSnapshot,
  subscribeRoutines,
  validateRoutine,
} from "@/lib/routines";
import { MAX_SPORT_LENGTH, OTHER_SPORT } from "@/lib/schema";
import { sportIcon } from "@/lib/sport-icons";
import type { Level } from "@/types/workout";

// 추가 기능 — 내 루틴. 반복하는 운동(요일·종목·시간·강도)을 저장해 두면, 홈 화면에 오늘의 루틴으로 나타난다.
const EMPTY: never[] = [];

export default function RoutineCard() {
  const routines = useSyncExternalStore(
    subscribeRoutines,
    getRoutinesSnapshot,
    () => EMPTY,
  );
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [sport, setSport] = useState("");
  const [customSport, setCustomSport] = useState("");
  const [minutes, setMinutes] = useState("");
  const [intensity, setIntensity] = useState<Level | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDays([]);
    setSport("");
    setCustomSport("");
    setMinutes("");
    setIntensity(null);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalSport = sport === OTHER_SPORT ? customSport.trim() : sport;
    if (finalSport === "") {
      setError(
        sport === OTHER_SPORT
          ? "종목을 직접 입력해 주세요"
          : "종목을 선택해 주세요",
      );
      return;
    }
    if (intensity === null) {
      setError("강도를 선택해 주세요");
      return;
    }
    const checked = validateRoutine({
      days,
      sport: finalSport,
      minutes: minutes.trim() === "" ? NaN : Number(minutes),
      intensity,
    });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    const result = addRoutine(checked.value);
    if (result === "ok") {
      reset();
      setOpen(false);
    } else if (result === "full") {
      setError(`루틴은 최대 ${MAX_ROUTINES}개까지 만들 수 있어요`);
    } else {
      setError("저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.");
    }
  }

  return (
    <section
      aria-label="내 루틴"
      className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">내 루틴</h2>
          <p className="mt-1 text-sm text-ink/60">
            반복하는 운동을 저장해 두면, 그 요일에 홈 화면에서 한 번에 기록을
            시작할 수 있어요.
          </p>
        </div>
        {!open && routines.length < MAX_ROUTINES && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-11 rounded-xl bg-ink/5 px-5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/10"
          >
            + 루틴 만들기
          </button>
        )}
      </div>

      {routines.length > 0 && (
        <ul className="mt-4 space-y-2">
          {routines.map((routine) => (
            <li
              key={routine.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-ink/5 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  <span aria-hidden="true">{sportIcon(routine.sport)}</span>{" "}
                  {routine.sport} {routine.minutes}분 · 강도 {routine.intensity}
                </p>
                <p className="mt-0.5 text-xs text-ink/60">
                  매주 {formatDays(routine.days)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteRoutine(routine.id)}
                aria-label={`${routine.sport} ${formatDays(routine.days)} 루틴 삭제`}
                className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium text-ink/60 transition-colors hover:bg-red-500/10 hover:text-red-600"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      {routines.length === 0 && !open && (
        <p className="mt-4 text-sm text-ink/60">아직 루틴이 없어요.</p>
      )}

      {open && (
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="루틴 만들기"
          className="mt-4 flex flex-col gap-5 rounded-2xl border border-ink/10 bg-surface p-4 sm:p-5"
        >
          <fieldset>
            <legend className="text-sm font-medium text-ink/80">
              반복 요일
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_NAMES.map((name, index) => {
                const on = days.includes(index);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setDays((prev) =>
                        prev.includes(index)
                          ? prev.filter((d) => d !== index)
                          : [...prev, index],
                      )
                    }
                    className={`size-11 rounded-xl text-sm font-medium transition-colors ${
                      on
                        ? "bg-chip text-white"
                        : "bg-ink/5 text-ink/70 hover:bg-ink/10"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <SportLabel
                id="routine-sport-label"
                hasValue={sport !== ""}
                onClear={() => setSport("")}
              />
              <SportSelect
                value={sport}
                onChange={setSport}
                labelledBy="routine-sport-label"
              />
              {sport === OTHER_SPORT && (
                <input
                  type="text"
                  maxLength={MAX_SPORT_LENGTH}
                  value={customSport}
                  onChange={(event) => setCustomSport(event.target.value)}
                  placeholder={`종목을 직접 입력 (${MAX_SPORT_LENGTH}자 이하)`}
                  aria-label="종목 직접 입력"
                  className={`${fieldClass} ${fieldOk} mt-2`}
                />
              )}
            </div>
            <label className="block">
              <span className="text-sm font-medium text-ink/80">
                운동 시간(분)
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                placeholder="예: 30"
                className={`${fieldClass} ${fieldOk} mt-2`}
              />
            </label>
          </div>

          <LevelPicker
            legend="강도"
            hint="1 가벼움 ~ 5 매우 힘듦"
            name="routine-intensity"
            value={intensity}
            onChange={setIntensity}
            onClear={() => setIntensity(null)}
          />

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-chip h-11 rounded-xl px-6 text-sm font-medium"
            >
              루틴 저장
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="h-11 rounded-xl bg-ink/5 px-5 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/10"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
