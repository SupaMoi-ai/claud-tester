"use client";

import localforage from "localforage";
import type { ParkingListItem } from "./types";
import type { OfflineQueuedReport } from "./availability-offline";

const STORE_NAME = "stavanger-parking";

let _store: LocalForage | null = null;

function store(): LocalForage {
  if (_store) return _store;
  _store = localforage.createInstance({
    name: STORE_NAME,
    storeName: "snapshot",
  });
  return _store;
}

export type Snapshot = {
  fetchedAt: string;
  items: ParkingListItem[];
};

export async function saveSnapshot(items: ParkingListItem[]): Promise<void> {
  const snap: Snapshot = { fetchedAt: new Date().toISOString(), items };
  await store().setItem("snapshot", snap);
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  return (await store().getItem<Snapshot>("snapshot")) ?? null;
}

export async function queueReport(report: OfflineQueuedReport): Promise<void> {
  const queue = (await store().getItem<OfflineQueuedReport[]>("queue")) ?? [];
  queue.push(report);
  await store().setItem("queue", queue);
}

export async function readQueuedReports(): Promise<OfflineQueuedReport[]> {
  return (await store().getItem<OfflineQueuedReport[]>("queue")) ?? [];
}

export async function flushQueuedReports(
  send: (r: OfflineQueuedReport) => Promise<boolean>,
): Promise<number> {
  const queue = await readQueuedReports();
  const remaining: OfflineQueuedReport[] = [];
  let sent = 0;
  for (const r of queue) {
    const ok = await send(r).catch(() => false);
    if (ok) sent++;
    else remaining.push(r);
  }
  await store().setItem("queue", remaining);
  return sent;
}
