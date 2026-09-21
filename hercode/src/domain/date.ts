import type { ISODate, ISODateTime } from './types';

/** Date helpers. Monday-first weeks, 24h time, no locale surprises. */

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = fromISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  const a = fromISODate(from).getTime();
  const b = fromISODate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(date: ISODate): number {
  return (fromISODate(date).getDay() + 6) % 7;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function weekdayName(date: ISODate): string {
  return WEEKDAYS[weekdayIndex(date)] ?? '';
}

/** 'HH:mm' -> minutes since midnight. */
export function minutesOfDay(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatTime(time: string): string {
  return time;
}

export function hourOf(timestamp: ISODateTime): number {
  return new Date(timestamp).getHours();
}

export function dateOf(timestamp: ISODateTime): ISODate {
  return timestamp.slice(0, 10);
}

/** Composes an ISO timestamp without touching the timezone. */
export function atTime(date: ISODate, hour: number, minute = 0): ISODateTime {
  const d = fromISODate(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function isBefore18(now: Date): boolean {
  return now.getHours() < 18;
}
