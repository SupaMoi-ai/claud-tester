"use client";

import { useEffect, useState } from "react";
import type { ParkingListItem } from "@/lib/types";
import { formatHHMM, formatRemaining } from "@/lib/free-window";

export default function FreeUntilCountdown({ item }: { item: ParkingListItem }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (item.freeUntil) {
    const d = new Date(item.freeUntil);
    if (d > now) {
      return (
        <span>
          Free until {formatHHMM(d)}
          <span className="text-ink/40"> · {formatRemaining(d, now)} left</span>
        </span>
      );
    }
  }
  if (item.paidUntil) {
    const d = new Date(item.paidUntil);
    if (d > now) {
      return <span>Paid until {formatHHMM(d)}</span>;
    }
  }
  return null;
}
