// Design Ref: §3.2 — 화면 1(오늘 기록). 지금은 빈 틀만 두고, 입력 폼은 PLAN 작업 4번에서 넣는다.
export default function Home() {
  return (
    <section>
      <h1 className="text-xl font-bold">오늘 기록</h1>
      <p className="mt-2 text-sm text-foreground/70">
        운동을 마친 뒤 기록을 남기면 AI가 피드백과 다음 운동 계획을 알려 줘요.
      </p>
      <p className="mt-6 rounded-lg border border-dashed border-foreground/20 p-4 text-sm text-foreground/60">
        기록 입력 폼은 다음 작업에서 이곳에 들어와요.
      </p>
    </section>
  );
}
