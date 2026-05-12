"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ParkingMap from "./ParkingMap";
import BottomSheet, { type SheetSnap } from "./BottomSheet";
import DestinationSearch from "./DestinationSearch";
import FilterBar from "./FilterBar";
import ParkingCard from "./ParkingCard";
import ParkingDetail from "./ParkingDetail";
import OfflineBadge from "./OfflineBadge";
import ZoneLegend from "./ZoneLegend";
import AdminDrawer from "./AdminDrawer";
import {
  flushQueuedReports,
  loadSnapshot,
  queueReport,
  saveSnapshot,
} from "@/lib/offline-cache";
import type { ParkingListItem } from "@/lib/types";

type Status = "idle" | "loading" | "ready" | "offline" | "error";

export default function AppShell() {
  const [items, setItems] = useState<ParkingListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SheetSnap>("list");
  const [snapshotAge, setSnapshotAge] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const refreshRef = useRef<number>(0);

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (origin) {
      params.set("lat", String(origin.lat));
      params.set("lng", String(origin.lng));
    }
    if (filters.size) params.set("filters", Array.from(filters).join(","));
    params.set("include", "patterns");

    setStatus("loading");
    try {
      const resp = await fetch(`/api/parking?${params}`, { cache: "no-store" });
      if (!resp.ok) throw new Error("fetch_failed");
      const json = (await resp.json()) as { items: ParkingListItem[]; fetchedAt: string };
      setItems(json.items);
      setStatus("ready");
      setSnapshotAge(null);
      await saveSnapshot(json.items);
    } catch {
      const snap = await loadSnapshot();
      if (snap) {
        setItems(snap.items);
        setStatus("offline");
        setSnapshotAge(snap.fetchedAt);
      } else {
        setStatus("error");
      }
    }
  }, [filters, origin]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const onOnline = async () => {
      const sent = await flushQueuedReports(async (r) => {
        const resp = await fetch("/api/user-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId: r.locationId,
            reportType: "OCCUPANCY",
            occupancyPercent: r.occupancyPercent,
          }),
        });
        return resp.ok;
      });
      if (sent > 0) fetchItems();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [fetchItems]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSnap("detail");
  }, []);

  const onReport = useCallback(
    async (locationId: string, occupancyPercent: number) => {
      try {
        const resp = await fetch("/api/user-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId,
            reportType: "OCCUPANCY",
            occupancyPercent,
          }),
        });
        if (!resp.ok) throw new Error("send_failed");
        refreshRef.current = window.setTimeout(() => fetchItems(), 400);
      } catch {
        await queueReport({
          locationId,
          occupancyPercent,
          createdAt: new Date().toISOString(),
        });
      }
    },
    [fetchItems],
  );

  return (
    <main className="fixed inset-0 bg-paper text-ink overflow-hidden">
      <ParkingMap
        items={items}
        origin={origin}
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="mx-auto max-w-xl px-3 pt-3 flex items-start gap-2 pointer-events-auto">
          <button
            type="button"
            onContextMenu={(e) => {
              e.preventDefault();
              setAdminOpen(true);
            }}
            onTouchStart={(e) => {
              const t = window.setTimeout(() => setAdminOpen(true), 700);
              const cancel = () => window.clearTimeout(t);
              e.currentTarget.addEventListener("touchend", cancel, { once: true });
              e.currentTarget.addEventListener("touchmove", cancel, { once: true });
            }}
            className="shrink-0 rounded-full bg-paper/95 border border-ink/10 px-3 py-2 text-sm font-medium"
            aria-label="Stavanger Parking Helper"
          >
            P
          </button>
          <div className="flex-1">
            <DestinationSearch
              onPick={(p) => {
                setOrigin(p);
                setSnap("list");
              }}
            />
          </div>
        </div>
        <div className="mx-auto max-w-xl px-3 mt-2 pointer-events-auto">
          <FilterBar value={filters} onChange={setFilters} />
        </div>
      </header>

      <ZoneLegend />

      {(status === "offline" || snapshotAge) && (
        <OfflineBadge fetchedAt={snapshotAge} />
      )}

      <BottomSheet snap={snap} onSnapChange={setSnap}>
        {snap !== "detail" && (
          <div className="px-3 pb-6">
            <div className="text-xs text-ink/60 px-1 mb-2">
              {status === "loading" && "Looking up parking…"}
              {status === "ready" && `${items.length} parking ${items.length === 1 ? "spot" : "spots"} nearby`}
              {status === "offline" && `Offline — ${items.length} cached`}
              {status === "error" && "Could not load parking and no cache available"}
            </div>
            <ul className="snap-list space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
              {items.map((it) => (
                <li key={it.id}>
                  <ParkingCard item={it} onTap={() => onSelect(it.id)} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-snug text-ink/50 px-1">
              Always check signs on site. Parking rules may change.
            </p>
          </div>
        )}
        {snap === "detail" && selected && (
          <ParkingDetail
            item={selected}
            onBack={() => setSnap("list")}
            onReport={onReport}
          />
        )}
      </BottomSheet>

      <AdminDrawer open={adminOpen} onClose={() => setAdminOpen(false)} onImported={fetchItems} />
    </main>
  );
}
