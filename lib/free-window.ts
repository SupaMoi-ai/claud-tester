import type { FreeWindow, EnforcementWindow, RuleDTO } from "./types";

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function windowApplies(
  win: { daysOfWeek: number[]; startMinute: number; endMinute: number },
  now: Date,
): boolean {
  const dow = now.getDay();
  if (!win.daysOfWeek.includes(dow)) return false;
  const m = minutesOfDay(now);
  if (win.startMinute <= win.endMinute) {
    return m >= win.startMinute && m < win.endMinute;
  }
  return m >= win.startMinute || m < win.endMinute;
}

function nextBoundary(
  win: { daysOfWeek: number[]; startMinute: number; endMinute: number },
  now: Date,
  kind: "start" | "end",
): Date | null {
  const target = kind === "start" ? win.startMinute : win.endMinute;
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(0, 0, 0, 0);
    if (!win.daysOfWeek.includes(candidate.getDay())) continue;
    const c = new Date(candidate.getTime() + target * 60_000);
    if (c > now) return c;
  }
  return null;
}

export function isFreeNow(rules: RuleDTO[], now: Date): boolean {
  if (rules.length === 0) return false;
  for (const r of rules) {
    if (r.freeWindow && windowApplies(r.freeWindow, now)) return true;
  }
  for (const r of rules) {
    if (r.enforcementWindow) {
      if (windowApplies(r.enforcementWindow, now)) return false;
    }
  }
  const anyEnforcement = rules.some((r) => r.enforcementWindow);
  return anyEnforcement;
}

export function freeUntil(rules: RuleDTO[], now: Date): Date | null {
  for (const r of rules) {
    if (r.freeWindow && windowApplies(r.freeWindow, now)) {
      return nextBoundary(r.freeWindow, now, "end");
    }
  }
  for (const r of rules) {
    if (r.enforcementWindow && !windowApplies(r.enforcementWindow, now)) {
      return nextBoundary(r.enforcementWindow, now, "start");
    }
  }
  return null;
}

export function paidUntil(rules: RuleDTO[], now: Date): Date | null {
  for (const r of rules) {
    if (r.enforcementWindow && windowApplies(r.enforcementWindow, now)) {
      return nextBoundary(r.enforcementWindow, now, "end");
    }
  }
  return null;
}

export function nextFreeWindowStart(rules: RuleDTO[], now: Date): Date | null {
  for (const r of rules) {
    if (r.freeWindow && !windowApplies(r.freeWindow, now)) {
      return nextBoundary(r.freeWindow, now, "start");
    }
  }
  return null;
}

export function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatRemaining(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "0m";
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
