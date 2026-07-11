import { Home, HomeOrBegge } from "@/lib/custody/resolveHome";

export interface DerivedBagItemInput {
  name: string;
  forKid?: string;
  dueDate?: string;
  travelsTo?: Home;
}

export interface RelatedEvent {
  kidNames?: string[];
  home: HomeOrBegge;
  startsAtIso?: string;
}

export interface DerivedBagItem {
  name: string;
  forKidName?: string;
  dueDate: string;
  travelsTo: Home;
}

export interface ReisesekkenFallback {
  /** ISO date (YYYY-MM-DD) to use when a bag item has no due date of its own. */
  dueDateIso: string;
  /** Home to use when a bag item has no travels_to and no related event to infer it from. */
  travelsTo: Home;
}

/**
 * Fills in the gaps the AI capture may leave on bag items so every reisesekken
 * row is always immediately actionable (a concrete home + a concrete deadline):
 *  - due_date defaults to the next handover date.
 *  - travels_to is inferred from a related event's home (matched by kid name)
 *    when the AI didn't supply one directly, falling back to the next
 *    handover's destination home.
 */
export function deriveBagItems(
  items: DerivedBagItemInput[],
  relatedEvents: RelatedEvent[],
  fallback: ReisesekkenFallback
): DerivedBagItem[] {
  return items.map((item) => {
    const matchingEvent = item.forKid
      ? relatedEvents.find((e) => e.kidNames?.includes(item.forKid as string))
      : undefined;

    const inferredTravelsTo =
      matchingEvent && matchingEvent.home !== "begge" ? matchingEvent.home : undefined;

    const travelsTo = item.travelsTo ?? inferredTravelsTo ?? fallback.travelsTo;
    const dueDate = item.dueDate ?? matchingEvent?.startsAtIso?.slice(0, 10) ?? fallback.dueDateIso;

    return {
      name: item.name,
      forKidName: item.forKid,
      dueDate,
      travelsTo,
    };
  });
}
