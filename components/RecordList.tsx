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
import BackupPanel from "@/components/BackupPanel";
import RecordEditor from "@/components/RecordEditor";
import BadgeCard from "@/components/BadgeCard";
import HeatmapCard from "@/components/HeatmapCard";
import RecoveryCard from "@/components/RecoveryCard";
import GoalCard from "@/components/GoalCard";
import StatsPanel from "@/components/StatsPanel";
import RoutineCard from "@/components/RoutineCard";
import WeeklyReportCard from "@/components/WeeklyReportCard";
import TrendCard from "@/components/TrendCard";
import WeeklyChart from "@/components/WeeklyChart";
import RetryAnalysis from "@/components/RetryAnalysis";
import { addSampleRecords } from "@/lib/sample";
import {
  ALL_SPORTS,
  NO_FILTER,
  PERIODS,
  filterRecords,
  isFiltered,
  type Period,
  type RecordFilter,
} from "@/lib/filter";
import { sportIcon } from "@/lib/sport-icons";
import type { Workout } from "@/types/workout";

// Design Ref: §3.3, §3.4 — 화면 2의 기록 목록. 최신순, 항목마다 삭제 버튼, 전체 삭제(확인 창 포함),
// 분석 결과가 있으면 보기, 기록이 없으면 "아직 기록이 없어요".
// N2: 종목 필터(16번). 그래프는 전체 기록 기준이고, 필터는 아래 목록에만 적용된다.

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
  const [editing, setEditing] = useState(false);
  return (
    <li className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 sm:p-6 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink/60">{formatDate(record.date)}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            <span aria-hidden="true">{sportIcon(record.sport)}</span>{" "}
            {record.sport} {record.minutes}분
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>강도 {record.intensity}</Pill>
            <Pill>컨디션 {record.condition}</Pill>
            {record.pain && <Pill tone="pain">통증 있음</Pill>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            aria-expanded={editing}
            aria-label={`${formatDate(record.date)} ${record.sport} 기록 수정`}
            className="rounded-xl px-4 py-2 text-sm font-medium text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(record)}
            aria-label={`${formatDate(record.date)} ${record.sport} 기록 삭제`}
            className="rounded-xl px-4 py-2 text-sm font-medium text-ink/60 transition-colors hover:bg-red-500/10 hover:text-red-600"
          >
            삭제
          </button>
        </div>
      </div>

      {editing && (
        <RecordEditor record={record} onClose={() => setEditing(false)} />
      )}

      {coach ? (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium text-ink/70 hover:text-ink">
            분석 결과 보기
          </summary>
          <div className="mt-3">
            <CoachPanel record={{ ...record, coach }} />
          </div>
        </details>
      ) : (
        <RetryAnalysis recordId={record.id} failed={false} />
      )}
    </li>
  );
}

/** 처음에 보여 주는 기록 카드 수 */
const INITIAL_VISIBLE = 5;

export default function RecordList() {
  // 서버 화면을 그릴 때는 null(= 아직 브라우저에서 불러오지 못함)이라 서버 화면과 어긋나지 않는다. (§4.4)
  // 기록이 바뀌면(삭제·다른 탭 등) lib/storage.ts가 알려 줘서 자동으로 다시 그려진다.
  const records = useSyncExternalStore<Workout[] | null>(
    subscribeRecords,
    getRecordsSnapshot,
    () => null,
  );
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RecordFilter>(NO_FILTER);
  // 기록 카드는 처음에 최근 INITIAL_VISIBLE건만 보여 주고, "더보기"를 눌렀을 때만 나머지를 펼친다.
  const [expanded, setExpanded] = useState(false);

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
    return <p className="text-base text-ink/60">기록을 불러오는 중이에요…</p>;
  }

  // 백업 패널은 빈 화면과 목록 화면에서 같은 자리(둘째 칸)에 둬서, 가져오기 직후 화면이 바뀌어도 안내 문구가 유지된다.
  const backup = (
    <div className="mt-8">
      <BackupPanel count={records.length} />
    </div>
  );

  if (records.length === 0) {
    return (
      <div>
        <div className="flex flex-col items-start gap-5 rounded-[28px] border border-ink/10 bg-surface/70 p-6 sm:p-8 shadow-[0_40px_70px_rgba(40,60,110,0.12),0_6px_14px_rgba(20,30,60,0.08)]">
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
          <button
            type="button"
            onClick={() => addSampleRecords()}
            className="rounded-xl bg-ink/5 px-6 py-3 text-base font-medium text-ink/80 transition-colors hover:bg-ink/10"
          >
            샘플 기록으로 둘러보기
          </button>
        </div>
        {backup}
      </div>
    );
  }

  // 저장된 순서는 오래된 것 → 최신이라, 목록에서는 뒤집어 최신순으로 보여 준다.
  // 필터 선택지는 저장된 기록에 실제로 있는 종목만 (처음 나온 순서). 고른 종목의 기록이 모두 삭제되면 "전체"로 돌아간다.
  const sports = [...new Set(records.map((record) => record.sport))];
  // 고른 종목의 기록이 모두 삭제되면 "전체"로 돌아간다.
  const activeFilter: RecordFilter = {
    ...filter,
    sport: sports.includes(filter.sport) ? filter.sport : ALL_SPORTS,
  };
  const filtered = filterRecords(records, activeFilter);
  const newestFirst = [...filtered].reverse();
  const hiddenCount = Math.max(0, newestFirst.length - INITIAL_VISIBLE);
  const visibleRecords = expanded
    ? newestFirst
    : newestFirst.slice(0, INITIAL_VISIBLE);

  return (
    <div>
      <div>
        <div className="flex flex-col gap-6">
          <RecoveryCard />
          <GoalCard records={records} />
          <WeeklyReportCard records={records} />
          <RoutineCard />
          <HeatmapCard records={records} />
          <WeeklyChart records={records} />
          <TrendCard records={records} />
          <StatsPanel records={records} />
          <BadgeCard records={records} />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink/60">
            {isFiltered(activeFilter)
              ? `조건에 맞는 기록 ${filtered.length}건 (전체 ${records.length}건)`
              : `총 ${records.length}건`}{" "}
            · 최신순
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-ink/70">
              종목
              <select
                value={activeFilter.sport}
                onChange={(event) =>
                  setFilter({ ...activeFilter, sport: event.target.value })
                }
                className="h-10 rounded-xl border border-ink/10 bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <option value={ALL_SPORTS}>전체</option>
                {sports.map((sport) => (
                  <option key={sport} value={sport}>
                    {sportIcon(sport)} {sport}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              기간
              <select
                value={activeFilter.period}
                onChange={(event) =>
                  setFilter({
                    ...activeFilter,
                    period: event.target.value as Period,
                  })
                }
                className="h-10 rounded-xl border border-ink/10 bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={activeFilter.painOnly}
                onChange={(event) =>
                  setFilter({ ...activeFilter, painOnly: event.target.checked })
                }
                className="size-4 accent-accent"
              />
              통증 있는 기록만
            </label>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        {filtered.length === 0 && (
          <div className="mt-4 rounded-2xl bg-ink/5 p-5 text-sm text-ink/60">
            조건에 맞는 기록이 없어요.{" "}
            <button
              type="button"
              onClick={() => setFilter(NO_FILTER)}
              className="font-medium text-ink underline underline-offset-4"
            >
              필터 초기화
            </button>
          </div>
        )}
        <ul id="record-cards" className="mt-4 flex flex-col gap-4">
          {visibleRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onDelete={handleDelete}
            />
          ))}
        </ul>
        {hiddenCount > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-controls="record-cards"
              className="rounded-xl bg-ink/5 px-6 py-3 text-base font-medium text-ink/80 transition-colors hover:bg-ink/10"
            >
              {expanded ? "숨기기" : `더보기 (${hiddenCount}건)`}
            </button>
          </div>
        )}
      </div>
      {backup}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleClearAll}
          className="rounded-xl px-4 py-2 text-sm font-medium text-ink/60 transition-colors hover:bg-red-500/10 hover:text-red-600"
        >
          전체 삭제
        </button>
      </div>
    </div>
  );
}
