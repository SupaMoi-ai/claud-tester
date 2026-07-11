import { CustodyOverride, CustodyPattern, Home, homeForDate } from "./resolveHome.ts";
import { addDaysIso, osloDateTimeToUtc, toOsloParts } from "./osloTime.ts";

export interface NextHandover {
  /** Exact instant of the next handover. */
  at: Date;
  from: Home;
  to: Home;
}

const MAX_LOOKAHEAD_DAYS = 60;

/**
 * Scans forward from `now` to find the next moment custody changes hands,
 * for the "Neste bytte" countdown on the command center.
 */
export function nextHandover(
  now: Date,
  pattern: CustodyPattern,
  overrides: CustodyOverride[]
): NextHandover {
  const { date: todayIso } = toOsloParts(now);

  for (let i = 0; i <= MAX_LOOKAHEAD_DAYS; i++) {
    const dayIso = addDaysIso(todayIso, i);
    const nextDayIso = addDaysIso(dayIso, 1);
    const day = homeForDate(dayIso, pattern, overrides);
    const nextDay = homeForDate(nextDayIso, pattern, overrides);

    if (day.home === nextDay.home) {
      continue;
    }

    const handoverInstant = osloDateTimeToUtc(dayIso, pattern.handoverTime);
    if (handoverInstant.getTime() > now.getTime()) {
      return { at: handoverInstant, from: day.home, to: nextDay.home };
    }
  }

  throw new Error(
    `Fant ingen bytte innen ${MAX_LOOKAHEAD_DAYS} dager — sjekk bytteplanen (f.eks. ett hjem for alle dager).`
  );
}
