import RecoveryCard from "@/components/RecoveryCard";
import WorkoutForm from "@/components/WorkoutForm";

// Design Ref: §3.2, §3.5 — 화면 1(오늘 기록). 큰 두 줄 제목 + 부제 + 기록 입력 폼.
// AI 결과 카드는 PLAN 작업 12번에서 폼 아래에 붙인다.
export default function Home() {
  return (
    <section>
      <h1 className="rise-in text-5xl font-medium leading-[1.05] tracking-[-0.03em] sm:text-6xl">
        오늘의 운동을
        <br />
        기록해 볼까요?
      </h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-relaxed text-ink/60">
        운동을 마친 뒤 기록을 남기면 AI가 피드백과 다음 운동 계획을 알려 줘요.
      </p>
      <div className="rise-in rise-in-3 mt-12 flex flex-col gap-6">
        <RecoveryCard />
        <WorkoutForm />
      </div>
    </section>
  );
}
