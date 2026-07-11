const OSLO_TZ = "Europe/Oslo";

/** "torsdag 25. juni" */
export function formatLongDate(at: Date): string {
  const weekday = new Intl.DateTimeFormat("nb-NO", {
    timeZone: OSLO_TZ,
    weekday: "long",
  }).format(at);
  const day = new Intl.DateTimeFormat("nb-NO", {
    timeZone: OSLO_TZ,
    day: "numeric",
  }).format(at);
  const month = new Intl.DateTimeFormat("nb-NO", {
    timeZone: OSLO_TZ,
    month: "long",
  }).format(at);
  // nb-NO's "day: numeric" formatter already appends the trailing period (e.g. "9."),
  // so no extra "." is added here.
  return `${weekday} ${day} ${month}`;
}

/** "torsdag" */
export function formatWeekday(at: Date, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("nb-NO", { timeZone: OSLO_TZ, weekday: style }).format(at);
}

/** "16:00" */
export function formatTime(at: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    timeZone: OSLO_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/** "torsdag 25. juni kl 16:00" */
export function formatLongDateTime(at: Date): string {
  return `${formatLongDate(at)} kl ${formatTime(at)}`;
}

/** Countdown like "2 dager 4 timer" or "45 min" for the next-handover pill. */
export function formatCountdown(from: Date, to: Date): string {
  const totalMinutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days} d ${hours} t` : `${days} d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} t ${minutes} min` : `${hours} t`;
  }
  return `${minutes} min`;
}
