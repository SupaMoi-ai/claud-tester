"use client";

import type { ParkingListItem } from "@/lib/types";

export default function AvailabilityBadge({ item }: { item: ParkingListItem }) {
  const occ = item.estimatedOccupancyPercent;
  let label: string;
  if (occ < 40) label = "Likely open";
  else if (occ < 75) label = "Half full";
  else if (occ < 95) label = "Filling up";
  else label = "Likely full";
  return (
    <span>
      {label}
      <span className="text-ink/40"> · est {occ}%</span>
    </span>
  );
}
