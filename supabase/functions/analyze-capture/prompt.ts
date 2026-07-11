import {
  CustodyOverride,
  CustodyPattern,
  homeForDate,
} from "../../../lib/custody/resolveHome.ts";
import { addDaysIso } from "../../../lib/custody/osloTime.ts";

/**
 * The delt-bosted moat: a compact "which home is each of the next N days"
 * block, computed with the exact same resolveHome/homeForDate logic the app
 * uses everywhere else, so Claude's home_suggestion is grounded in the real
 * bytteplan instead of guessing.
 */
export function buildBytteplanContext(
  pattern: CustodyPattern,
  overrides: CustodyOverride[],
  todayIso: string,
  days = 14
): string {
  const lines: string[] = [];
  for (let i = 0; i < days; i++) {
    const dateIso = addDaysIso(todayIso, i);
    const { home } = homeForDate(dateIso, pattern, overrides);
    const weekday = new Intl.DateTimeFormat("nb-NO", {
      timeZone: "Europe/Oslo",
      weekday: "long",
    }).format(new Date(`${dateIso}T12:00:00Z`));
    lines.push(`${dateIso} (${weekday}): ${home === "mamma" ? "Mamma" : "Pappa"}`);
  }
  return lines.join("\n");
}

export function buildSystemPrompt(bytteplanContext: string, kidNames: string[]): string {
  const dayCount = bytteplanContext.split("\n").filter((l) => l.length > 0).length;

  return `Du er assistenten i Hjemmet, en norsk familie-app for foreldre med delt bosted.

Du får et utklipp (skjermbilde eller tekst) fra en norsk kilde som Spond, Vigilo, MyKid, Kidplan, en skolemelding eller en Vipps-forespørsel. Oppgaven din er å lese innholdet og returnere strukturert JSON som fanger hendelser, ting som må pakkes ("reisesekken"), pengekrav og forslag til gjøremål.

Familiens barn heter: ${kidNames.length > 0 ? kidNames.join(", ") : "ukjent"}.

Familiens bytteplan for de neste ${dayCount} dagene (hvilket hjem barna er hos):
${bytteplanContext}

Bruk denne bytteplanen til å avgjøre "home_suggestion" for hver hendelse: se på hvilken dato hendelsen faller på, finn hjemmet for den datoen i bytteplanen over, og forklar kort hvorfor i "home_reason" (for eksempel "14. juli er en tirsdag, som er en Pappa-dag i bytteplanen."). Ikke hopp over dette steget - det er appens viktigste funksjon. Bruk "begge" hvis hendelsen strekker seg over dager hos begge hjem, og "ukjent" bare hvis datoen faller utenfor bytteplanen over.

Returner UTELUKKENDE gyldig JSON (ingen markdown, ingen forklaring utenfor JSON) som matcher nøyaktig denne strukturen:

{
  "summary": string,
  "source_guess": "spond" | "vigilo" | "mykid" | "kidplan" | "skole" | "vipps" | "annet",
  "events": [{
    "title": string,
    "starts_at": string,
    "ends_at": string (valgfri),
    "location": string (valgfri),
    "kid_names": string[] (valgfri),
    "home_suggestion": "mamma" | "pappa" | "begge" | "ukjent",
    "home_reason": string
  }],
  "bag_items": [{
    "name": string,
    "for_kid": string (valgfri),
    "due_date": string (valgfri),
    "travels_to": "mamma" | "pappa" (valgfri)
  }],
  "money_items": [{
    "title": string,
    "amount_nok": number,
    "vipps_number": string (valgfri),
    "due_date": string (valgfri)
  }],
  "chore_suggestions": [{
    "kid_name": string,
    "title": string,
    "hint": string (valgfri)
  }]
}

Regler:
- "summary" skal være norsk (bokmål) og maksimalt én setning.
- "starts_at" og "ends_at" skal være ISO 8601 med tidssone, for eksempel "2026-07-14T17:00:00+02:00".
- "due_date" skal være en ISO-dato, for eksempel "2026-07-14".
- Hvis noe ikke finnes i innholdet (for eksempel ingen pengekrav), returner en tom liste for det feltet. Ikke finn på informasjon som ikke står i kilden.`;
}

export function buildUserMessage(rawText: string | null, hasImage: boolean): string {
  if (hasImage && rawText) {
    return `Her er et skjermbilde og tilhørende tekst som fulgte med:\n\n${rawText}`;
  }
  if (hasImage) {
    return "Her er et skjermbilde. Les innholdet og lag strukturert JSON som beskrevet i systeminstruksen.";
  }
  return `Her er teksten som skal analyseres:\n\n${rawText ?? ""}`;
}
