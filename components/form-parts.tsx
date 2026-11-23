import type { Level } from "@/types/workout";

// 기록 입력 폼(WorkoutForm)과 기록 수정(RecordEditor)이 함께 쓰는 입력 부품.
// 칸 스타일, 오류 문구, 1~5단계 선택 버튼.

const LEVELS: Level[] = [1, 2, 3, 4, 5];

export const fieldClass =
  "h-12 w-full rounded-xl border bg-surface px-4 text-base outline-none transition-colors focus-visible:ring-2";
export const fieldOk =
  "border-ink/10 focus:border-ink/40 focus-visible:ring-accent/40";
export const fieldBad =
  "border-red-500 focus:border-red-500 focus-visible:ring-red-500/30";

export function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-medium text-red-600">
      {message}
    </p>
  );
}

// 1~5단계 알약형 선택 버튼 (라디오). 선택하면 어두운 칩 색으로 바뀐다.
export function LevelPicker({
  legend,
  hint,
  name,
  value,
  error,
  onChange,
  onClear,
}: {
  legend: string;
  hint: string;
  name: string;
  value: Level | null;
  error?: string;
  onChange: (level: Level) => void;
  /** 고른 값을 취소한다. (고른 버튼을 다시 누르거나 "선택 취소"를 누를 때) */
  onClear: () => void;
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
              // 이미 고른 버튼을 다시 누르면 선택을 취소한다.
              onClick={() => {
                if (value === level) onClear();
              }}
              className="peer sr-only"
            />
            <span
              className={`flex size-12 items-center justify-center rounded-xl text-base font-medium transition-colors peer-checked:bg-chip peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60 ${
                error
                  ? "bg-red-500/10 hover:bg-red-500/100/20"
                  : "bg-ink/5 hover:bg-ink/10"
              }`}
            >
              {level}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-sm text-ink/50">{hint}</p>
        {value !== null && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-sm text-ink/50 underline-offset-4 hover:text-ink hover:underline"
          >
            선택 취소
          </button>
        )}
      </div>
      <ErrorText id={errorId} message={error} />
    </fieldset>
  );
}

/** 종목 칸의 이름표 줄. 종목을 골랐다면 오른쪽에 "선택 취소"가 보인다. */
export function SportLabel({
  id,
  hasValue,
  onClear,
}: {
  id: string;
  hasValue: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-sm font-medium text-ink/80">
        종목
      </span>
      {hasValue && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-ink/50 underline-offset-4 hover:text-ink hover:underline"
        >
          선택 취소
        </button>
      )}
    </div>
  );
}
