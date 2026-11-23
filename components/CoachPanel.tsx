import type { CoachResponse } from "@/types/workout";

// Design Ref: §3.3, §3.5 — AI 결과 카드(짙은 패널 + 주황 포인트). 입력 화면의 결과와 기록 목록이 같이 쓴다.
export default function CoachPanel({ coach }: { coach: CoachResponse }) {
  return (
    <div className="rounded-2xl bg-panel p-6 text-white">
      <p className="text-base leading-relaxed text-white/90">{coach.feedback}</p>
      <p className="mt-5 text-sm text-white/50">다음 운동 계획</p>
      <p className="mt-1 text-lg font-semibold">
        <span className="text-accent">{coach.plan.sport}</span>{" "}
        {coach.plan.minutes}분 · 강도 {coach.plan.intensity}
      </p>
      {coach.notices.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-white/60">
          {coach.notices.map((notice) => (
            <li key={notice}>· {notice}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
