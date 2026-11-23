"use client";

import { useState, useSyncExternalStore } from "react";
import {
  buildWeeklyReportRequest,
  getReportSnapshot,
  subscribeReport,
} from "@/lib/weekly-report";
import { createWeeklyReport } from "@/lib/weekly-report-client";
import { sportIcon } from "@/lib/sport-icons";
import type { Workout, WeeklyReport } from "@/types/workout";

// AI 주간 리포트 — 최근 4주 기록을 AI가 요약하고 다음 주 월~일 계획을 짜 준다. 결과는 이 브라우저에 저장돼서 다시 볼 수 있다.
function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ReportBody({ report }: { report: WeeklyReport }) {
  return (
    <div className="rise-in mt-4 rounded-2xl bg-panel p-5 text-white sm:p-6">
      <p className="text-base leading-relaxed text-white/90">
        {report.summary}
      </p>

      {report.tips.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-white/70">
          {report.tips.map((tip) => (
            <li key={tip}>
              <span className="text-accent">✓</span> {tip}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-white/50">다음 주 계획</p>
      <ol className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {report.plan.map((day) => (
          <li
            key={day.day}
            className={`rounded-xl p-3 ${day.sport ? "bg-white/10" : "bg-white/5"}`}
          >
            <p className="text-xs font-semibold text-white/50">{day.day}</p>
            {day.sport ? (
              <>
                <p className="mt-1 text-sm font-semibold">
                  <span aria-hidden="true">{sportIcon(day.sport)}</span>{" "}
                  {day.sport}
                </p>
                <p className="mt-0.5 text-xs text-white/60">
                  {day.minutes}분 · 강도 {day.intensity}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-white/40">😴 휴식</p>
            )}
          </li>
        ))}
      </ol>

      {report.notices.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-white/60">
          {report.notices.map((notice) => (
            <li key={notice}>· {notice}</li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-white/40">
        {formatCreated(report.createdAt)}에 만든 리포트예요. AI 조언은
        참고용이며 의학적 진단이 아니에요.
      </p>
    </div>
  );
}

export default function WeeklyReportCard({ records }: { records: Workout[] }) {
  const report = useSyncExternalStore(
    subscribeReport,
    getReportSnapshot,
    () => null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasRecent = buildWeeklyReportRequest(records, 3) !== null;

  async function handleCreate() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const outcome = await createWeeklyReport();
    setBusy(false);
    if (outcome === "no-records")
      setMessage("최근 4주 안에 기록이 없어서 만들 수 없어요.");
    else if (outcome === "failed")
      setMessage("리포트를 만들지 못했습니다. 다시 시도해 주세요.");
  }

  return (
    <section
      aria-label="AI 주간 리포트"
      className="rounded-[28px] border border-ink/10 bg-white/70 p-5 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            AI 주간 리포트
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            최근 4주 기록을 요약하고, 다음 주 계획을 요일별로 짜 줘요.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy || !hasRecent}
          className="btn-chip h-11 rounded-xl px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "만드는 중…" : report ? "다시 만들기" : "리포트 만들기"}
        </button>
      </div>
      {!hasRecent && (
        <p className="mt-3 text-sm text-ink/50">
          최근 4주 안에 기록이 있으면 만들 수 있어요.
        </p>
      )}
      <p className="mt-2 text-xs text-ink/40">
        최근 4주 기록(날짜·시간·종목·강도 등)만 AI로 전송돼요.
      </p>
      {message && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {message}
        </p>
      )}
      {report && <ReportBody report={report} />}
    </section>
  );
}
