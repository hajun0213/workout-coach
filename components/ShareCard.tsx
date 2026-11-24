"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getGoalSnapshot, subscribeGoal } from "@/lib/goal";
import { formatShareMinutes, summarizeShareWeek, type ShareWeek } from "@/lib/share-card";
import { sportIcon } from "@/lib/sport-icons";
import { DEFAULT_WEEKLY_GOAL } from "@/lib/stats";
import type { Workout } from "@/types/workout";

// 공유 이미지 카드 — 이번 주 요약을 1080×1350 이미지(PNG)로 그려 저장·공유한다.
// 서버로 아무것도 보내지 않고 브라우저의 canvas로만 그린다. 숫자 요약만 담고 이름·메모는 넣지 않는다.

const W = 1080;
const H = 1350;
const FONT = '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(canvas: HTMLCanvasElement, week: ShareWeek) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#14234f");
  bg.addColorStop(1, "#0b1226");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "#9fb4ff";
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText("오늘의 운동 코치", 80, 140);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 84px ${FONT}`;
  ctx.fillText("이번 주 운동", 80, 260);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `500 40px ${FONT}`;
  ctx.fillText(week.rangeLabel, 80, 322);

  // 횟수 / 목표
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 260px ${FONT}`;
  ctx.fillText(String(week.count), 80, 640);
  const countWidth = ctx.measureText(String(week.count)).width;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 64px ${FONT}`;
  ctx.fillText(`/ ${week.goal}회`, 80 + countWidth + 24, 640);

  // 목표 달성 막대
  const barW = W - 160;
  const ratio = Math.min(1, week.count / week.goal);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, 80, 690, barW, 28, 14);
  ctx.fill();
  if (ratio > 0) {
    ctx.fillStyle = week.count >= week.goal ? "#46d27f" : "#6b8cff";
    roundRect(ctx, 80, 690, Math.max(28, barW * ratio), 28, 14);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = `500 36px ${FONT}`;
  ctx.fillText(
    week.count >= week.goal
      ? "🎉 이번 주 목표 달성!"
      : `목표까지 ${week.goal - week.count}회 남았어요`,
    80,
    784,
  );

  // 세부 수치 3칸
  const items: [string, string][] = [
    ["총 운동 시간", week.minutes > 0 ? formatShareMinutes(week.minutes) : "-"],
    ["평균 강도", week.avgIntensity === null ? "-" : String(week.avgIntensity)],
    ["연속 운동", week.streak > 0 ? `${week.streak}일` : "-"],
  ];
  const gap = 24;
  const boxW = (W - 160 - gap * 2) / 3;
  items.forEach(([label, value], i) => {
    const x = 80 + i * (boxW + gap);
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    roundRect(ctx, x, 850, boxW, 200, 28);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `500 32px ${FONT}`;
    ctx.fillText(label, x + 28, 908);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 52px ${FONT}`;
    ctx.fillText(value, x + 28, 998);
  });

  // 대표 종목
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  roundRect(ctx, 80, 1080, W - 160, 130, 28);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText("가장 많이 한 운동", 108, 1135);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText(
    week.topSport ? `${sportIcon(week.topSport)} ${week.topSport}` : "-",
    108,
    1190,
  );

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText("기록하고, 코칭 받고, 한 주를 돌아봐요", 80, 1286);
}

export default function ShareCard({ records }: { records: Workout[] }) {
  const goal = useSyncExternalStore(
    subscribeGoal,
    getGoalSnapshot,
    () => DEFAULT_WEEKLY_GOAL,
  );
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const week = summarizeShareWeek(records, goal);

  useEffect(() => {
    if (open && canvasRef.current) draw(canvasRef.current, week);
  });

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) =>
      canvasRef.current
        ? canvasRef.current.toBlob(resolve, "image/png")
        : resolve(null),
    );
  }

  async function save() {
    const blob = await toBlob();
    if (!blob) return setMessage("이미지를 만들지 못했어요. 다시 시도해 주세요.");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "이번주-운동-카드.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("이미지를 저장했어요.");
  }

  async function share() {
    const blob = await toBlob();
    if (!blob) return setMessage("이미지를 만들지 못했어요. 다시 시도해 주세요.");
    const file = new File([blob], "이번주-운동-카드.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "이번 주 운동 카드" });
      } catch {
        // 공유 창을 닫은 경우 — 조용히 넘어간다.
      }
    } else {
      setMessage("이 기기에서는 바로 공유할 수 없어요. 이미지를 저장해 보내 주세요.");
    }
  }

  return (
    <section
      aria-label="공유 이미지 카드"
      className="rounded-[28px] border border-ink/10 bg-surface/70 p-5 sm:p-6 shadow-[0_24px_50px_rgba(40,60,110,0.08),0_4px_10px_rgba(20,30,60,0.06)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          이번 주 카드 이미지
        </h2>
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setMessage("");
          }}
          aria-expanded={open}
          className="h-10 rounded-xl bg-chip px-5 text-sm font-medium text-white transition-colors hover:bg-chip-hover"
        >
          {open ? "닫기" : "카드 만들기"}
        </button>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        이번 주 횟수·시간·연속 일수를 이미지로 만들어 저장하거나 공유해요. 숫자만
        담기고, 서버로는 아무것도 보내지 않아요.
      </p>

      {open && (
        <div className="mt-4 flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`이번 주 운동 ${week.count}회, 목표 ${week.goal}회, 총 ${formatShareMinutes(week.minutes)}`}
            className="h-auto w-full max-w-sm rounded-2xl shadow-lg"
          />
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={save}
              className="h-10 rounded-xl bg-chip px-5 text-sm font-medium text-white transition-colors hover:bg-chip-hover"
            >
              이미지 저장
            </button>
            <button
              type="button"
              onClick={share}
              className="h-10 rounded-xl bg-ink/5 px-5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/10"
            >
              공유하기
            </button>
          </div>
          {message && (
            <p role="status" className="text-sm text-ink/70">
              {message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
