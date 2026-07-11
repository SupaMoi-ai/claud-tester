import { toOsloParts, addDaysIso, daysBetweenIso } from "./osloTime.ts";

export type Home = "mamma" | "pappa";
export type HomeOrBegge = Home | "begge";

export interface CustodyPattern {
  /** Cycle of homes, one entry per day, e.g. 7 entries for a weekly pattern. */
  pattern: Home[];
  /** ISO date (YYYY-MM-DD) that pattern[0] applies to. */
  anchorDate: string;
  /** "HH:mm" (or "HH:mm:ss"), the time of day custody changes hands on a handover day. */
  handoverTime: string;
}

export interface CustodyOverride {
  /** ISO date (YYYY-MM-DD) this override applies to. */
  date: string;
  home: Home;
  note?: string;
}

export interface DateHome {
  home: Home;
  source: "override" | "pattern";
}

export interface ResolvedHome extends DateHome {
  /** True if the calendar date `at` falls on changes hands (regardless of which side of the cutoff `at` is on). */
  isHandoverDay: boolean;
}

/** The pattern's home for a given ISO date, ignoring overrides. Cycles on pattern.length. */
export function patternHomeForDate(
  dateIso: string,
  pattern: CustodyPattern
): Home {
  const n = pattern.pattern.length;
  if (n === 0) {
    throw new Error("Custody pattern must have at least one day.");
  }
  const offset = daysBetweenIso(pattern.anchorDate, dateIso);
  const idx = ((offset % n) + n) % n;
  const home = pattern.pattern[idx];
  if (!home) {
    throw new Error(`Custody pattern has no entry at index ${idx}.`);
  }
  return home;
}

/** The effective home for an ISO date: an override wins, else the pattern applies. */
export function homeForDate(
  dateIso: string,
  pattern: CustodyPattern,
  overrides: CustodyOverride[]
): DateHome {
  const override = overrides.find((o) => o.date === dateIso);
  if (override) {
    return { home: override.home, source: "override" };
  }
  return { home: patternHomeForDate(dateIso, pattern), source: "pattern" };
}

function parseMinutesOfDay(time: string): number {
  const [hh, mm] = time.split(":");
  return Number(hh) * 60 + Number(mm ?? "0");
}

/**
 * Resolves which home a given instant belongs to.
 *
 * Rules (in order):
 * 1. An override for a date always wins over the pattern for that date.
 * 2. The pattern cycles on `pattern.pattern.length` days from `anchorDate`.
 * 3. On a handover day (today's home differs from tomorrow's), `handoverTime`
 *    splits the day: before it, today's home; at or after it, tomorrow's home.
 */
export function resolveHome(
  at: Date,
  pattern: CustodyPattern,
  overrides: CustodyOverride[]
): ResolvedHome {
  const { date, hour, minute } = toOsloParts(at);
  const today = homeForDate(date, pattern, overrides);
  const tomorrowIso = addDaysIso(date, 1);
  const tomorrow = homeForDate(tomorrowIso, pattern, overrides);

  const isHandoverDay = today.home !== tomorrow.home;

  if (!isHandoverDay) {
    return { ...today, isHandoverDay: false };
  }

  const nowMinutes = hour * 60 + minute;
  const handoverMinutes = parseMinutesOfDay(pattern.handoverTime);

  if (nowMinutes < handoverMinutes) {
    return { ...today, isHandoverDay: true };
  }
  return { ...tomorrow, isHandoverDay: true };
}
