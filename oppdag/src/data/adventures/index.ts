import type { Adventure } from '../../adventure/types';
import { isbjornen } from './isbjornen';

/**
 * The adventure registry.
 *
 * One complete adventure in the MVP, by design — the brief asks for a first
 * adventure that is genuinely excellent rather than six that are half-built.
 * The other places on the island are visible and teased, and drop in here as
 * they are written.
 *
 * Localisation: a translated adventure becomes its own file (`isbjornen.nn.ts`)
 * and is selected here by locale, the same way `i18n/index.ts` picks chrome.
 */
export const ADVENTURES: Adventure[] = [isbjornen];

export const ADVENTURES_BY_ID: Record<string, Adventure> = Object.fromEntries(
  ADVENTURES.map((a) => [a.id, a]),
);

export function getAdventure(id: string | undefined): Adventure | undefined {
  return id ? ADVENTURES_BY_ID[id] : undefined;
}

/** Adventures offered from a given place on the map. */
export function adventuresAt(locationId: string): Adventure[] {
  return ADVENTURES.filter((a) => a.locationId === locationId);
}
