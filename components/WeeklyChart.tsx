import { summarizeWeeks } from "@/lib/weekly";
import type { Workout } from "@/types/workout";

// Design Ref: §3.3, §3.5 (N1) — 최근 4주 운동 횟수·총 시간 막대 그래프. 막대는 코발트, 이번 주는 주황.
// 별도 그래프 도구 없이 Tailwind로 막대를 그린다.

function weekName(weeksAgo: number): string {
  return weeksAgo === 0
    ? "이번 주"
    : weeksAgo === 1
      ? "지난주"
      : `${weeksAgo}주 전`;
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total}분`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function BarGroup({
  title,
  values,
  format,
}: {
  title: string;
  values: { key: number; label: string; value: number; current: boolean }[];
  format: (value: number) => string;
}) {
  const max = Math.max(1, ...values.map((v) => v.value));
  return (
    <div>
      <p className="text-sm font-medium text-ink/70">{title}</p>
      <ul className="mt-3 flex h-36 items-end gap-3">
        {values.map((v) => (
          <li
            key={v.key}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-xs font-medium text-ink/70">
              {format(v.value)}
            </span>
            <div
              role="presentation"
              style={{ height: `${(v.value / max) * 100}%` }}
              className={`w-full max-w-12 rounded-t-lg ${v.current ? "bg-leaf" : "bg-cobalt"} ${v.value === 0 ? "min-h-0.5 opacity-30" : "min-h-1.5"}`}
            />
            <span className="mt-1 text-xs text-ink/50">{v.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WeeklyChart({ records }: { records: Workout[] }) {
  const weeks = summarizeWeeks(records);
  const thisWeek = weeks[weeks.length - 1];
  const bars = (pick: (w: (typeof weeks)[number]) => number) =>
    weeks.map((w) => ({
      key: w.weeksAgo,
      label: weekName(w.weeksAgo),
      value: pick(w),
      current: w.weeksAgo === 0,
    }));

  return (
    <section
      aria-label="주간 요약"
      className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 sm:p-6 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">주간 요약</h2>
        <p className="text-sm text-ink/60">
          이번 주{" "}
          <span className="font-semibold text-leaf-text">
            {thisWeek.count}회
          </span>{" "}
          ·{" "}
          <span className="font-semibold text-leaf-text">
            {formatMinutes(thisWeek.minutes)}
          </span>
        </p>
      </div>
      <div className="mt-5 grid gap-8 sm:grid-cols-2">
        <BarGroup
          title="운동 횟수"
          values={bars((w) => w.count)}
          format={(v) => `${v}회`}
        />
        <BarGroup
          title="총 운동 시간"
          values={bars((w) => w.minutes)}
          format={formatMinutes}
        />
      </div>
      <p className="mt-4 text-xs text-ink/40">
        최근 4주, 월요일부터 한 주예요. 같은 날 여러 번 기록해도 모두 세요.
      </p>
    </section>
  );
}
