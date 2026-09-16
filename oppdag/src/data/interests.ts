import type { Subject } from '../learning/types';

/**
 * What the child says they're curious about. Drives which discovery cards and
 * which adventures get surfaced first — curiosity chooses the route, the
 * learning graph chooses the content.
 */
export interface Interest {
  id: string;
  label: string;
  emoji: string;
  /** Token name from tokens.css — chips tint themselves with this. */
  tone: 'butter' | 'sky' | 'moss' | 'coral' | 'lavender';
  /** Subjects this interest naturally pulls towards. */
  leans: Subject[];
  /** Concepts a child with this interest is likely to enjoy meeting. */
  concepts: string[];
}

export const INTERESTS: Interest[] = [
  { id: 'dinosaurer', label: 'Dinosaurer', emoji: '🦖', tone: 'moss',
    leans: ['naturfag'], concepts: ['dyr', 'leveomraader'] },
  { id: 'dyr', label: 'Dyr', emoji: '🐾', tone: 'butter',
    leans: ['naturfag'], concepts: ['dyr', 'arktiske-dyr', 'leveomraader'] },
  { id: 'verdensrommet', label: 'Verdensrommet', emoji: '🚀', tone: 'lavender',
    leans: ['naturfag'], concepts: ['lys-og-himmel', 'aarstider'] },
  { id: 'tegning', label: 'Tegning', emoji: '🎨', tone: 'coral',
    leans: ['norsk'], concepts: ['former-og-rom', 'fortelling'] },
  { id: 'havet', label: 'Havet', emoji: '🌊', tone: 'sky',
    leans: ['naturfag'], concepts: ['havet', 'kart-og-sted'] },
  { id: 'roboter', label: 'Roboter', emoji: '🤖', tone: 'sky',
    leans: ['matematikk'], concepts: ['moenster', 'fysikk-krefter'] },
  { id: 'sport', label: 'Sport', emoji: '⚽', tone: 'moss',
    leans: ['matematikk'], concepts: ['maaling-lengde', 'klokka'] },
  { id: 'historie', label: 'Historie', emoji: '🏰', tone: 'butter',
    leans: ['norsk'], concepts: ['fortelling', 'klokka'] },
  { id: 'musikk', label: 'Musikk', emoji: '🎵', tone: 'lavender',
    leans: ['matematikk'], concepts: ['moenster', 'telling-oppover-nedover'] },
  { id: 'bygging', label: 'Bygging', emoji: '🧱', tone: 'coral',
    leans: ['matematikk'], concepts: ['former-og-rom', 'fysikk-krefter', 'maaling-lengde'] },
  { id: 'naturen', label: 'Naturen', emoji: '🌋', tone: 'moss',
    leans: ['naturfag'], concepts: ['okosystem', 'vaer', 'aarstider'] },
  { id: 'fortellinger', label: 'Fortellinger', emoji: '📖', tone: 'butter',
    leans: ['norsk'], concepts: ['leseforstaaelse', 'fortelling', 'ordforraad'] },
];

export const INTERESTS_BY_ID: Record<string, Interest> = Object.fromEntries(
  INTERESTS.map((x) => [x.id, x]),
);

export function getInterest(id: string): Interest | undefined {
  return INTERESTS_BY_ID[id];
}
