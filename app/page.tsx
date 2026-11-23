// Design Ref: §3.2, §3.5 — 화면 1(오늘 기록). 큰 두 줄 제목 + 부제.
// 지금은 입력 폼 자리를 비워 두고, 폼은 PLAN 작업 4번에서 넣는다.
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
      <div className="rise-in rise-in-3 mt-12 flex items-center gap-3 rounded-[28px] border border-ink/10 bg-white/70 p-8 text-base text-ink/60 shadow-[0_40px_70px_rgba(40,60,110,0.12),0_6px_14px_rgba(20,30,60,0.08)]">
        <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
        기록 입력 폼은 다음 작업에서 이곳에 들어와요.
      </div>
    </section>
  );
}
