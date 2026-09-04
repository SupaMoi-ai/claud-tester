/**
 * Time formatting.
 *
 * Signal age is load-bearing in this product: a report is only ever a claim
 * about a moment, so every signal carries how old it is, and the phrasing must
 * be unambiguous at a glance on a moving train.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;

/** "JUST NOW" / "3 MIN AGO" / "1 H 20 AGO" */
export function ago(ms, nowMs = Date.now()) {
  const d = Math.max(0, nowMs - ms);
  if (d < 45_000) return 'JUST NOW';
  const mins = Math.round(d / MIN);
  if (mins < 60) return `${mins} MIN AGO`;
  const h = Math.floor(d / HOUR);
  const m = Math.round((d % HOUR) / MIN);
  return m ? `${h} H ${m} AGO` : `${h} H AGO`;
}

/** "IN 4 MIN" / "NOW" / "12:04" once it is far enough out to need a clock time. */
export function until(ms, nowMs = Date.now()) {
  const d = ms - nowMs;
  if (d <= 0) return 'NOW';
  const mins = Math.round(d / MIN);
  if (mins < 1) return 'NOW';
  if (mins <= 20) return `IN ${mins} MIN`;
  return clock(ms);
}

/** Local wall-clock time, 24h, zero-padded — "07:42". */
export function clock(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Signed minute delta, for delays: 0 -> null, 8 -> "+8 MIN", -2 -> "-2 MIN". */
export function delta(minutes) {
  if (!minutes) return null;
  const sign = minutes > 0 ? '+' : '−';
  return `${sign}${Math.abs(minutes)} MIN`;
}

/** Minutes between two epoch times, rounded. */
export function minutesBetweenMs(a, b) {
  return Math.round((b - a) / MIN);
}

/** Today's weekday as 0=Mon..6=Sun, matching how journeys store their days. */
export function weekdayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

/** Minutes since local midnight — used to test a journey's time window. */
export function minutesOfDay(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

/** "07:30" -> 450 */
export function parseHHMM(s) {
  const [h, m] = String(s).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
