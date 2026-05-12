"use client";

import type { ParkingListItem } from "@/lib/types";
import { walkingMinutes } from "@/lib/geo";
import PriceBadge from "./PriceBadge";
import AvailabilityBadge from "./AvailabilityBadge";
import FreeUntilCountdown from "./FreeUntilCountdown";
import { ZONE_COLORS } from "@/lib/zone-status";

export default function ParkingCard({
  item,
  onTap,
}: {
  item: ParkingListItem;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full text-left rounded-xl border border-ink/10 bg-paper px-3 py-3 active:bg-ink/5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-1 h-3 w-3 rounded-full shrink-0"
          style={{ background: ZONE_COLORS[item.zoneStatus] }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium truncate">{item.name}</h3>
            {item.walkingMeters != null && (
              <span className="text-xs text-ink/60 shrink-0">
                {walkingMinutes(item.walkingMeters)} min walk
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/70">
            <PriceBadge item={item} />
            <AvailabilityBadge item={item} />
            <FreeUntilCountdown item={item} />
          </div>
        </div>
      </div>
    </button>
  );
}
