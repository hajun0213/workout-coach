import RecordList from "@/components/RecordList";

// Design Ref: §3.3, §3.5 — 화면 2(기록 목록). 큰 제목 + 부제 + 기록 목록.
export default function RecordsPage() {
  return (
    <section>
      <h1 className="rise-in text-5xl font-medium leading-[1.05] tracking-[-0.03em] sm:text-6xl">
        기록 목록
      </h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-relaxed text-ink/60">
        저장한 운동 기록을 최신순으로 볼 수 있어요. 기록은 이 기기·브라우저에만
        남아요.
      </p>
      <div className="rise-in rise-in-3 mt-12">
        <RecordList />
      </div>
    </section>
  );
}
