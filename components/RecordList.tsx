"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  clearRecords,
  deleteRecord,
  getRecordsSnapshot,
  subscribeRecords,
} from "@/lib/storage";
import CoachPanel from "@/components/CoachPanel";
import RetryAnalysis from "@/components/RetryAnalysis";
import type { Workout } from "@/types/workout";

// Design Ref: §3.3, §3.4 — 화면 2의 기록 목록. 최신순, 항목마다 삭제 버튼, 전체 삭제(확인 창 포함),
// 분석 결과가 있으면 보기, 기록이 없으면 "아직 기록이 없어요".
// 다음 작업에서 붙일 것: 주간 그래프(N1), 종목 필터(N2).

// 저장 시각(ISO)을 브라우저의 시간대 기준 "2026-11-23 18:30"으로 보여 준다. (§4.1)
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Pill({
  tone = "plain",
  children,
}: {
  tone?: "plain" | "pain";
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        tone === "pain" ? "bg-accent/15 text-[#b93a0b]" : "bg-ink/5 text-ink/70"
      }`}
    >
      {children}
    </span>
  );
}

function RecordCard({
  record,
  onDelete,
}: {
  record: Workout;
  onDelete: (record: Workout) => void;
}) {
  const { coach } = record;
  return (
    <li className="rounded-[28px] border border-ink/10 bg-white/70 p-6 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink/50">{formatDate(record.date)}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            {record.sport} {record.minutes}분
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>강도 {record.intensity}</Pill>
            <Pill>컨디션 {record.condition}</Pill>
            {record.pain && <Pill tone="pain">통증 있음</Pill>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(record)}
          aria-label={`${formatDate(record.date)} ${record.sport} 기록 삭제`}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-ink/60 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          삭제
        </button>
      </div>

      {coach ? (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium text-ink/70 hover:text-ink">
            분석 결과 보기
          </summary>
          <div className="mt-3">
            <CoachPanel coach={coach} />
          </div>
        </details>
      ) : (
        <RetryAnalysis recordId={record.id} failed={false} />
      )}
    </li>
  );
}

export default function RecordList() {
  // 서버 화면을 그릴 때는 null(= 아직 브라우저에서 불러오지 못함)이라 서버 화면과 어긋나지 않는다. (§4.4)
  // 기록이 바뀌면(삭제·다른 탭 등) lib/storage.ts가 알려 줘서 자동으로 다시 그려진다.
  const records = useSyncExternalStore<Workout[] | null>(
    subscribeRecords,
    getRecordsSnapshot,
    () => null,
  );
  const [error, setError] = useState<string | null>(null);

  function handleDelete(record: Workout) {
    setError(null);
    if (!deleteRecord(record.id)) {
      setError("삭제하지 못했어요. 브라우저 저장 설정을 확인해 주세요.");
    }
  }

  function handleClearAll() {
    if (!records || records.length === 0) return;
    setError(null);
    if (
      !window.confirm(
        `기록 ${records.length}건을 모두 삭제할까요? 되돌릴 수 없어요.`,
      )
    ) {
      return;
    }
    if (!clearRecords()) {
      setError("삭제하지 못했어요. 브라우저 저장 설정을 확인해 주세요.");
    }
  }

  if (records === null) {
    return <p className="text-base text-ink/50">기록을 불러오는 중이에요…</p>;
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 rounded-[28px] border border-ink/10 bg-white/70 p-8 shadow-[0_40px_70px_rgba(40,60,110,0.12),0_6px_14px_rgba(20,30,60,0.08)]">
        <p className="text-lg font-medium">아직 기록이 없어요</p>
        <p className="text-base text-ink/60">
          운동을 마친 뒤 오늘 기록을 남기면 이곳에 쌓여요.
        </p>
        <Link
          href="/"
          className="btn-chip rounded-xl px-6 py-3 text-base font-medium"
        >
          오늘 기록하러 가기
        </Link>
      </div>
    );
  }

  // 저장된 순서는 오래된 것 → 최신이라, 목록에서는 뒤집어 최신순으로 보여 준다.
  const newestFirst = [...records].reverse();

  return (
    <div>
      <p className="text-sm text-ink/50">총 {records.length}건 · 최신순</p>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <ul className="mt-4 flex flex-col gap-4">
        {newestFirst.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onDelete={handleDelete}
          />
        ))}
      </ul>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleClearAll}
          className="rounded-xl px-4 py-2 text-sm font-medium text-ink/60 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          전체 삭제
        </button>
      </div>
    </div>
  );
}
