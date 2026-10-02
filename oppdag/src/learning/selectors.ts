import { CONCEPTS, CONCEPTS_BY_ID } from '../data/concepts';
import type { ChildMastery, Concept, MasteryMap, MasteryState, Subject } from './types';
import { readMastery } from './masteryEngine';

/** Read-only queries over the concept graph + a child's mastery map. */

export function conceptsBySubject(subject: Subject | 'all'): Concept[] {
  return subject === 'all'
    ? CONCEPTS
    : CONCEPTS.filter((x) => x.subject === subject);
}

export function dependentsOf(conceptId: string): Concept[] {
  return CONCEPTS.filter((x) => x.prerequisites.includes(conceptId));
}

export function prerequisitesOf(conceptId: string): Concept[] {
  const concept = CONCEPTS_BY_ID[conceptId];
  if (!concept) return [];
  return concept.prerequisites
    .map((id) => CONCEPTS_BY_ID[id])
    .filter((x): x is Concept => Boolean(x));
}

/**
 * Graph depth — how many prerequisite hops from a root concept. Used to lay the
 * parent learning map out in tidy left-to-right layers instead of a hairball.
 */
export function conceptDepth(conceptId: string, seen = new Set<string>()): number {
  if (seen.has(conceptId)) return 0; // cycle guard; the seed graph has none
  seen.add(conceptId);
  const concept = CONCEPTS_BY_ID[conceptId];
  if (!concept || concept.prerequisites.length === 0) return 0;
  return (
    1 +
    Math.max(
      ...concept.prerequisites.map((id) => conceptDepth(id, new Set(seen))),
    )
  );
}

export function masteryOf(
  map: MasteryMap,
  childId: string,
  conceptId: string,
): ChildMastery {
  return readMastery(map, childId, conceptId);
}

export function stateOf(
  map: MasteryMap,
  childId: string,
  conceptId: string,
): MasteryState {
  return masteryOf(map, childId, conceptId).state;
}

export function countByState(
  map: MasteryMap,
  childId: string,
  subject: Subject | 'all' = 'all',
): Record<MasteryState, number> {
  const tally: Record<MasteryState, number> = {
    new: 0,
    exploring: 0,
    developing: 0,
    secure: 0,
  };
  for (const concept of conceptsBySubject(subject)) {
    tally[stateOf(map, childId, concept.id)] += 1;
  }
  return tally;
}

/** Concepts the child has actually met, most recent first. */
export function recentlyTouched(
  map: MasteryMap,
  limit = 6,
): { concept: Concept; mastery: ChildMastery }[] {
  return Object.values(map)
    .filter((m) => m.lastSeen > 0)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, limit)
    .map((mastery) => ({ concept: CONCEPTS_BY_ID[mastery.conceptId]!, mastery }))
    .filter((x) => Boolean(x.concept));
}

/**
 * Is every prerequisite at least `developing`? Used to decide whether a place
 * in the world is ready to open, and to grey a node as "kommer senere".
 */
export function prerequisitesMet(
  map: MasteryMap,
  childId: string,
  conceptId: string,
): boolean {
  return prerequisitesOf(conceptId).every((p) => {
    const s = stateOf(map, childId, p.id);
    return s === 'developing' || s === 'secure';
  });
}

/** Development-time integrity check, surfaced by tests/learning.test.ts. */
export function validateGraph(): string[] {
  const problems: string[] = [];
  const ids = new Set(CONCEPTS.map((x) => x.id));

  for (const concept of CONCEPTS) {
    for (const prerequisite of concept.prerequisites) {
      if (!ids.has(prerequisite)) {
        problems.push(`${concept.id}: unknown prerequisite "${prerequisite}"`);
      }
    }
  }

  // Cycle detection (DFS with a colour map).
  const colour = new Map<string, 0 | 1 | 2>();
  const visit = (id: string, trail: string[]): void => {
    if (colour.get(id) === 1) {
      problems.push(`cycle: ${[...trail, id].join(' → ')}`);
      return;
    }
    if (colour.get(id) === 2) return;
    colour.set(id, 1);
    for (const p of CONCEPTS_BY_ID[id]?.prerequisites ?? []) {
      visit(p, [...trail, id]);
    }
    colour.set(id, 2);
  };
  for (const concept of CONCEPTS) visit(concept.id, []);

  return problems;
}
