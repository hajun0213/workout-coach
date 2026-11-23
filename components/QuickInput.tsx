"use client";

import { useState } from "react";
import AiLoading from "@/components/AiLoading";
import { parseWorkoutText } from "@/lib/quick-input-client";
import { hasAnyValue, type QuickFill } from "@/lib/quick-input";
import { MAX_QUICK_TEXT } from "@/lib/schema";

// 한 줄 빠른 입력 — 운동을 문장으로 쓰면 AI가 아래 입력 칸을 채워 준다. 저장은 사용자가 확인하고 직접 누른다.
// 읽지 못한 항목은 비워 두고 알려 준다. 이미 입력한 칸은 AI가 읽어 낸 값이 있을 때만 바뀐다.
const EXAMPLE = "어제 저녁 러닝 40분, 좀 힘들었고 컨디션은 보통";

function summarize(fill: QuickFill): { filled: string[]; missing: string[] } {
  const filled: string[] = [];
  const missing: string[] = [];
  const add = (ok: boolean, label: string, text: string) =>
    (ok ? filled : missing).push(ok ? `${label} ${text}` : label);
  add(fill.sport !== null, "종목", fill.sport ?? "");
  add(fill.minutes !== null, "시간", `${fill.minutes}분`);
  add(fill.intensity !== null, "강도", String(fill.intensity));
  add(fill.condition !== null, "컨디션", String(fill.condition));
  if (fill.pain !== null) filled.push(`통증 ${fill.pain ? "있음" : "없음"}`);
  return { filled, missing };
}

export default function QuickInput({
  onFill,
}: {
  onFill: (fill: QuickFill) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { kind: "ok"; filled: string[]; missing: string[] }
    | { kind: "empty" }
    | { kind: "error" }
    | null
  >(null);

  async function handleFill() {
    if (busy || text.trim() === "") return;
    setBusy(true);
    setResult(null);
    const fill = await parseWorkoutText(text.trim());
    setBusy(false);
    if (!fill) {
      setResult({ kind: "error" });
    } else if (!hasAnyValue(fill)) {
      setResult({ kind: "empty" });
    } else {
      onFill(fill);
      setResult({ kind: "ok", ...summarize(fill) });
    }
  }

  return (
    <section
      aria-label="한 줄로 입력"
      className="rounded-2xl bg-ink/5 p-4 sm:p-5"
    >
      <label htmlFor="quick-text" className="text-sm font-medium text-ink/80">
        한 줄로 입력하기{" "}
        <span className="font-normal text-ink/50">(AI가 칸을 채워 줘요)</span>
      </label>
      <textarea
        id="quick-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={MAX_QUICK_TEXT}
        rows={2}
        placeholder={`예: ${EXAMPLE}`}
        className="mt-2 w-full resize-none rounded-xl border border-ink/10 bg-surface px-4 py-3 text-base outline-none transition-colors focus:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleFill}
          disabled={busy || text.trim() === ""}
          className="h-10 rounded-xl bg-chip px-5 text-sm font-medium text-white transition-colors hover:bg-chip-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "읽는 중…" : "AI로 채우기"}
        </button>
        <p className="text-xs text-ink/40">
          입력한 문장은 AI로 전송돼요. 이름·연락처는 쓰지 마세요. ({text.length}
          /{MAX_QUICK_TEXT})
        </p>
      </div>

      {busy && (
        <AiLoading
          lines={1}
          steps={["문장을 읽는 중", "입력 칸에 맞게 정리하는 중"]}
        />
      )}

      {result?.kind === "ok" && (
        <div role="status" className="mt-3 text-sm leading-relaxed text-ink/70">
          <p>
            <span className="font-semibold text-leaf-text">AI가 채웠어요:</span>{" "}
            {result.filled.join(" · ")}
          </p>
          {result.missing.length > 0 && (
            <p className="text-ink/50">
              읽지 못한 항목은 직접 골라 주세요: {result.missing.join(", ")}
            </p>
          )}
          <p className="text-ink/50">
            값이 맞는지 확인하고 수정한 뒤 저장해 주세요.
          </p>
        </div>
      )}
      {result?.kind === "empty" && (
        <p role="status" className="mt-3 text-sm text-ink/60">
          문장에서 운동 정보를 찾지 못했어요. 종목이나 시간을 넣어 다시 써
          보세요.
        </p>
      )}
      {result?.kind === "error" && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          읽지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </section>
  );
}
