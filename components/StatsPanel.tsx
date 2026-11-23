import { personalRecords, sportStats } from "@/lib/stats";
import { sportIcon } from "@/lib/sport-icons";
import type { Workout } from "@/types/workout";

// 추가 기능 — 종목별 통계와 개인 기록. 지금까지 저장된 모든 기록 기준이다.
function formatMinutes(total: number): string {
  if (total < 60) return `${total}분`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function StatsPanel({ records }: { records: Workout[] }) {
  const stats = sportStats(records);
  const pr = personalRecords(records);
  const maxCount = Math.max(1, ...stats.map((s) => s.count));

  const items = [
    {
      label: "전체 기록",
      value: `${pr.totalCount}회 · ${formatMinutes(pr.totalMinutes)}`,
      sub: "",
    },
    {
      label: "가장 길게 한 운동",
      value: pr.longest
        ? `${pr.longest.sport} ${formatMinutes(pr.longest.minutes)}`
        : "-",
      sub: pr.longest ? formatDay(pr.longest.date) : "",
    },
    { label: "한 주 최다 운동", value: `${pr.mostWeekCount}회`, sub: "" },
    { label: "최장 연속 운동", value: `${pr.longestDayStreak}일`, sub: "" },
  ];

  return (
    <section
      aria-label="통계와 개인 기록"
      className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)] sm:p-6"
    >
      <h2 className="text-lg font-semibold tracking-tight">내 기록 통계</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-ink/5 p-4">
            <dt className="text-xs text-ink/50">{item.label}</dt>
            <dd className="mt-1 text-base font-semibold tracking-tight">
              {item.value}
            </dd>
            {item.sub && <dd className="text-xs text-ink/40">{item.sub}</dd>}
          </div>
        ))}
      </dl>

      <h3 className="mt-6 text-sm font-medium text-ink/70">종목별</h3>
      <ul className="mt-3 space-y-3">
        {stats.map((s) => (
          <li key={s.sport}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
              <span className="font-medium">
                <span aria-hidden="true">{sportIcon(s.sport)}</span> {s.sport}
              </span>
              <span className="text-ink/60">
                {s.count}회 · 총 {formatMinutes(s.totalMinutes)} · 최장{" "}
                {formatMinutes(s.longestMinutes)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/10">
              <div
                style={{ width: `${(s.count / maxCount) * 100}%` }}
                className="h-full rounded-full bg-cobalt"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
