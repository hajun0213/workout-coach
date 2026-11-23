"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { fieldOk } from "@/components/form-parts";
import { SPORT_OPTIONS } from "@/lib/schema";
import { sportIcon } from "@/lib/sport-icons";

// 종목 선택 상자. 기본 선택 상자(<select>)는 목록 안에 아이콘을 넣을 수 없어서,
// 같은 동작(마우스·키보드)을 하는 목록 상자를 직접 만들었다. (ARIA select-only combobox 패턴)
// 키보드: ↑↓ 이동, Home/End 처음·끝, Enter/Space 선택, Esc 닫기.
export default function SportSelect({
  value,
  onChange,
  labelledBy,
  invalid,
  describedBy,
}: {
  value: string; // "" = 아직 안 고름
  onChange: (sport: string) => void;
  /** 이 상자의 이름표(보이는 글자)의 id */
  labelledBy: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // 키보드로 움직인 항목이 보이게 스크롤한다.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function openList() {
    const index = SPORT_OPTIONS.findIndex((option) => option === value);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(SPORT_OPTIONS[index]);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = SPORT_OPTIONS.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActive(last);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) choose(active);
        else openList();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative mt-2">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelledBy}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={`flex h-12 w-full items-center gap-3 rounded-xl border bg-surface px-4 text-left text-base outline-none transition-colors focus-visible:ring-2 ${invalid ? "border-red-500 focus-visible:ring-red-500/30" : fieldOk}`}
      >
        {value ? (
          <>
            <span aria-hidden="true" className="text-xl leading-none">
              {sportIcon(value)}
            </span>
            <span className="flex-1">{value}</span>
          </>
        ) : (
          <span className="flex-1 text-ink/40">종목을 선택하세요</span>
        )}
        <span
          aria-hidden="true"
          className={`text-xs text-ink/50 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={labelledBy}
          className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-ink/10 bg-surface p-1.5 shadow-[0_24px_50px_rgba(40,60,110,0.18),0_4px_10px_rgba(20,30,60,0.08)]"
        >
          {SPORT_OPTIONS.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option === value}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-base ${
                index === active ? "bg-ink/5" : ""
              } ${option === value ? "font-semibold" : ""}`}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                {sportIcon(option)}
              </span>
              <span className="flex-1">{option}</span>
              {option === value && (
                <span aria-hidden="true" className="text-sm text-accent">
                  ✓
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
