import type { GameState } from '../state/types';
import { emptyState } from '../state/types';

/**
 * Mia — the demo child.
 *
 * One realistic profile used throughout the prototype so the experience reads
 * as personalised rather than generic. She has done the starting activity and
 * has some early mastery, but has *not* been on the Svalbard adventure — that
 * is the thing a reviewer should get to play.
 */
export const DEMO_CHILD = {
  name: 'Mia',
  age: 8,
  grade: 3,
  interests: ['dyr', 'tegning', 'verdensrommet', 'bygging'],
} as const;

const now = Date.now();
const daysAgo = (n: number) => now - n * 86_400_000;

/** A little history, so the parent dashboard and world aren't empty on arrival. */
export function demoState(): GameState {
  const base = emptyState();
  const childId = 'mia-demo';

  const mastery = (
    conceptId: string,
    confidence: number,
    attempts: number,
    successes: number,
    lastSeen: number,
  ) => ({
    childId,
    conceptId,
    confidence,
    attempts,
    successes,
    hintsUsed: attempts - successes,
    lastSeen,
    state:
      confidence >= 0.7 && attempts >= 3
        ? ('secure' as const)
        : confidence >= 0.35
          ? ('developing' as const)
          : confidence >= 0.05
            ? ('exploring' as const)
            : ('new' as const),
  });

  return {
    ...base,
    parentAccepted: true,
    checkDone: true,
    profile: {
      id: childId,
      name: DEMO_CHILD.name,
      age: DEMO_CHILD.age,
      grade: DEMO_CHILD.grade,
      interests: [...DEMO_CHILD.interests],
      createdAt: daysAgo(9),
    },
    mastery: {
      'tall-1-20': mastery('tall-1-20', 0.86, 7, 7, daysAgo(2)),
      'telling-oppover-nedover': mastery('telling-oppover-nedover', 0.72, 4, 4, daysAgo(3)),
      'addisjon-under-20': mastery('addisjon-under-20', 0.61, 5, 4, daysAgo(1)),
      'subtraksjon-under-20': mastery('subtraksjon-under-20', 0.24, 3, 1, daysAgo(1)),
      bokstaver: mastery('bokstaver', 0.91, 6, 6, daysAgo(5)),
      'lese-ord': mastery('lese-ord', 0.78, 5, 5, daysAgo(4)),
      'lese-setninger': mastery('lese-setninger', 0.48, 4, 3, daysAgo(2)),
      dyr: mastery('dyr', 0.69, 4, 4, daysAgo(3)),
      aarstider: mastery('aarstider', 0.4, 3, 2, daysAgo(6)),
      'former-og-rom': mastery('former-og-rom', 0.33, 3, 2, daysAgo(4)),
    },
    // Reflects the mastery above: the forest and the bridge have already grown.
    unlocked: [...base.unlocked, 'skog', 'bro'],
    pendingUnlocks: [],
  };
}
