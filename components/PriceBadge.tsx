"use client";

import type { ParkingListItem } from "@/lib/types";

export default function PriceBadge({ item }: { item: ParkingListItem }) {
  if (item.isFreeNow) return <span>Free now</span>;
  const hourly = item.prices.find((p) => p.priceType === "HOURLY");
  if (hourly) return <span>{hourly.amountNok} NOK/h</span>;
  const free = item.prices.find((p) => p.priceType === "FREE");
  if (free) return <span>Free (with limits)</span>;
  if (item.parkingType === "RESIDENT") return <span>Permit only</span>;
  return <span>Price unknown</span>;
}
