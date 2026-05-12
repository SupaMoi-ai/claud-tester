"use client";

import { useEffect, useRef } from "react";

export type SheetSnap = "peek" | "list" | "detail";

const HEIGHTS: Record<SheetSnap, string> = {
  peek: "12vh",
  list: "55vh",
  detail: "90vh",
};

type Props = {
  snap: SheetSnap;
  onSnapChange: (s: SheetSnap) => void;
  children: React.ReactNode;
};

export default function BottomSheet({ snap, onSnapChange, children }: Props) {
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const onPop = () => {
      if (snap === "detail") onSnapChange("list");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [snap, onSnapChange]);

  return (
    <section
      className="absolute left-0 right-0 bottom-0 z-30 bg-paper border-t border-ink/10 rounded-t-2xl transition-[height] duration-300 ease-out"
      style={{ height: HEIGHTS[snap] }}
      aria-label="Parking results"
    >
      <button
        type="button"
        onClick={() => {
          if (snap === "peek") onSnapChange("list");
          else if (snap === "list") onSnapChange("detail");
          else onSnapChange("list");
        }}
        onTouchStart={(e) => {
          startY.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          const start = startY.current;
          const end = e.changedTouches[0]?.clientY ?? null;
          startY.current = null;
          if (start == null || end == null) return;
          const dy = end - start;
          if (dy < -30) {
            onSnapChange(snap === "peek" ? "list" : "detail");
          } else if (dy > 30) {
            onSnapChange(snap === "detail" ? "list" : "peek");
          }
        }}
        className="w-full pt-2 pb-2 flex items-center justify-center"
        aria-label="Toggle sheet"
      >
        <span className="block h-1.5 w-12 rounded-full bg-ink/20" />
      </button>
      <div className="h-[calc(100%-2rem)] overflow-y-auto no-scrollbar">{children}</div>
    </section>
  );
}
