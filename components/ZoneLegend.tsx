"use client";

import { useState } from "react";
import { ZONE_COLORS, ZONE_LABEL } from "@/lib/zone-status";

export default function ZoneLegend() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="absolute top-28 left-3 z-10 rounded-xl border border-ink/10 bg-paper/95 px-3 py-2 text-[11px] leading-tight">
      {(["free", "limited", "restricted"] as const).map((s) => (
        <div key={s} className="flex items-center gap-2 py-0.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: ZONE_COLORS[s] }}
          />
          <span>{ZONE_LABEL[s]}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="mt-1 text-ink/40 underline-offset-2 hover:underline"
      >
        hide
      </button>
    </div>
  );
}
