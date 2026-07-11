/**
 * Timezone utilities pinning all custody date math to Europe/Oslo local time,
 * independent of the device's own timezone. Kept free of React Native
 * imports so it can also run inside the Deno-based analyze-capture Edge
 * Function.
 */

const OSLO_TZ = "Europe/Oslo";

export interface OsloParts {
  /** ISO date, e.g. "2026-07-10". */
  date: string;
  hour: number;
  minute: number;
}

interface IsoDateParts {
  year: number;
  month: number;
  day: number;
}

function parseIsoDate(dateIso: string): IsoDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) {
    throw new Error(`Invalid ISO date: "${dateIso}"`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTimeOfDay(timeStr: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr);
  if (!match) {
    throw new Error(`Invalid time-of-day: "${timeStr}"`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Converts a real instant into its Europe/Oslo local date + time-of-day. */
export function toOsloParts(at: Date): OsloParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: OSLO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(at);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

/**
 * Converts an Europe/Oslo local date + "HH:mm" time back into a real instant,
 * correctly handling the CET/CEST (+1/+2) offset. Norway has used only these
 * two UTC offsets since long before any date this app will ever compute, so
 * trying both and picking the one whose forward conversion round-trips is
 * sufficient (no external tz database dependency needed).
 */
export function osloDateTimeToUtc(dateIso: string, timeStr: string): Date {
  const { year, month, day } = parseIsoDate(dateIso);
  const { hour, minute } = parseTimeOfDay(timeStr);

  for (const offsetHours of [1, 2]) {
    const candidate = new Date(
      Date.UTC(year, month - 1, day, hour - offsetHours, minute)
    );
    const parts = toOsloParts(candidate);
    if (parts.date === dateIso && parts.hour === hour && parts.minute === minute) {
      return candidate;
    }
  }
  // Fallback for the (practically unreachable) case neither offset round-trips:
  // assume standard time.
  return new Date(Date.UTC(year, month - 1, day, hour - 1, minute));
}

/** Adds `days` (may be negative) to an ISO date string, calendar-wise. */
export function addDaysIso(dateIso: string, days: number): string {
  const { year, month, day } = parseIsoDate(dateIso);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Whole calendar days from `fromIso` to `toIso` (positive if `toIso` is later). */
export function daysBetweenIso(fromIso: string, toIso: string): number {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}
