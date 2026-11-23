"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { MAX_BACKUP_BYTES, createBackup, parseBackup } from "@/lib/backup";
import { addSampleRecords } from "@/lib/sample";
import { loadRecords, mergeRecords } from "@/lib/storage";

// 추가 기능 — 기록 백업. 기록은 이 브라우저에만 있어서, 파일로 내보내 두면 브라우저 데이터를 지워도 다시 가져올 수 있다.
// 가져올 때는 합치기만 한다. (이미 있는 기록은 건너뛰고 지금 기록은 지우지 않는다)

type Message = { tone: "ok" | "error"; text: string };

function fileDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function BackupPanel({ count }: { count: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message | null>(null);

  function handleExport() {
    const records = loadRecords();
    if (records.length === 0) return;
    const blob = new Blob([createBackup(records)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workout-records-${fileDate(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: `기록 ${records.length}건을 파일로 저장했어요.` });
  }

  function handleSample() {
    const result = addSampleRecords();
    if (!result) {
      setMessage({ tone: "error", text: "저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요." });
    } else if (result.added === 0) {
      setMessage({ tone: "ok", text: "샘플 기록이 이미 들어 있어요." });
    } else {
      setMessage({ tone: "ok", text: `샘플 기록 ${result.added}건을 넣었어요. 필요 없으면 "전체 삭제"로 지울 수 있어요.` });
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // 같은 파일을 다시 골라도 동작하게
    if (!file) return;
    setMessage(null);
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage({ tone: "error", text: "파일이 너무 커요. (최대 5MB)" });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setMessage({ tone: "error", text: "파일을 읽지 못했어요." });
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setMessage({ tone: "error", text: parsed.message });
      return;
    }
    if (parsed.records.length === 0) {
      setMessage({ tone: "error", text: "가져올 수 있는 기록이 없어요." });
      return;
    }
    if (
      !window.confirm(
        `파일에서 기록 ${parsed.records.length}건을 찾았어요. 지금 기록에 합칠까요? (이미 있는 기록은 건너뛰고, 지금 기록은 지워지지 않아요)`,
      )
    ) {
      return;
    }
    const result = mergeRecords(parsed.records);
    if (!result) {
      setMessage({ tone: "error", text: "저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요." });
      return;
    }
    const notes = [
      result.duplicates > 0 ? `이미 있는 ${result.duplicates}건은 건너뜀` : "",
      parsed.skipped > 0 ? `형식이 맞지 않는 ${parsed.skipped}건은 제외` : "",
    ].filter(Boolean);
    setMessage({
      tone: "ok",
      text: `기록 ${result.added}건을 가져왔어요.${notes.length ? ` (${notes.join(", ")})` : ""}`,
    });
  }

  return (
    <section
      aria-label="기록 백업"
      className="rounded-[28px] border border-ink/10 bg-white/70 p-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold tracking-tight">기록 백업</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/60">
        기록은 이 브라우저에만 저장돼서, 브라우저 데이터를 지우면 사라져요. 파일로
        내보내 두면 다시 가져올 수 있어요.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={count === 0}
          className="h-11 rounded-xl bg-ink/5 px-5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          기록 내보내기
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-11 rounded-xl bg-ink/5 px-5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/10"
        >
          기록 가져오기
        </button>
        <button
          type="button"
          onClick={handleSample}
          className="h-11 rounded-xl bg-ink/5 px-5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/10"
        >
          샘플 기록 불러오기
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="sr-only"
          tabIndex={-1}
          aria-label="백업 파일 선택"
        />
      </div>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mt-3 text-sm font-medium ${message.tone === "error" ? "text-red-600" : "text-ink/70"}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
