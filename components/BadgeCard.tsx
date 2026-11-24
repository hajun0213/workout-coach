import { computeBadges } from "@/lib/achievements";
import type { Workout } from "@/types/workout";

// 추가 기능 — 배지. 기록으로 얻은 배지는 컬러로, 아직 못 얻은 배지는 흐리게 진행 상황과 함께 보여 준다.
export default function BadgeCard({ records }: { records: Workout[] }) {
  const badges = computeBadges(records);
  const earned = badges.filter((badge) => badge.earned).length;

  return (
    <section
      aria-label="배지"
      className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)] sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">배지</h2>
        <p className="text-sm text-ink/60">
          <span className="font-semibold text-leaf-text">{earned}개</span> /{" "}
          {badges.length}개 모았어요
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {badges.map((badge) => (
          <li
            key={badge.id}
            className={`flex items-start gap-3 rounded-2xl p-3 ${
              badge.earned ? "bg-leaf/10" : "bg-ink/5"
            }`}
          >
            <span
              aria-hidden="true"
              className={`text-2xl leading-none ${badge.earned ? "" : "opacity-30 grayscale"}`}
            >
              {badge.icon}
            </span>
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold ${badge.earned ? "text-ink" : "text-ink/60"}`}
              >
                {badge.name}
                <span className="sr-only">
                  {badge.earned ? " (획득)" : " (미획득)"}
                </span>
              </p>
              <p className="mt-0.5 text-xs leading-snug text-ink/60">
                {badge.earned
                  ? badge.description
                  : (badge.progress ?? badge.description)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
