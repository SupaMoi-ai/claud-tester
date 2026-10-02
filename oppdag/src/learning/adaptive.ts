import type { ChildMastery, Difficulty, SupportLevel } from './types';

/**
 * Adaptive behaviour.
 *
 * Two independent dials:
 *   1. `pickDifficulty` — which variant of the *next* task to show.
 *   2. The support ladder — how much help the child can pull on the task
 *      they are currently stuck on. Support is always pulled, never pushed:
 *      the answer is never revealed automatically.
 */

export const SUPPORT_LADDER: SupportLevel[] = ['none', 'hint', 'visual', 'guided'];

export function nextSupport(current: SupportLevel): SupportLevel {
  const i = SUPPORT_LADDER.indexOf(current);
  return SUPPORT_LADDER[Math.min(i + 1, SUPPORT_LADDER.length - 1)] as SupportLevel;
}

export function hasMoreSupport(current: SupportLevel): boolean {
  return current !== 'guided';
}

/**
 * Rolling record of how the last few tasks went, kept per session.
 * `true` = solved first try with no help.
 */
export interface Momentum {
  recent: boolean[];
}

export const emptyMomentum = (): Momentum => ({ recent: [] });

export function pushMomentum(m: Momentum, effortless: boolean): Momentum {
  return { recent: [...m.recent, effortless].slice(-4) };
}

const lastN = (m: Momentum, n: number) => m.recent.slice(-n);

/**
 * Choose the variant for the next task.
 *
 * Escalates after two effortless successes in a row, backs off after two
 * struggles. Existing confidence in the concept breaks the tie so a child
 * returning to something they already know does not get re-taught the basics.
 */
export function pickDifficulty(
  momentum: Momentum,
  mastery: ChildMastery | undefined,
): Difficulty {
  const last2 = lastN(momentum, 2);
  const twoEffortless = last2.length === 2 && last2.every(Boolean);
  const twoStruggles = last2.length === 2 && last2.every((x) => !x);

  if (twoStruggles) return 'easy';
  if (twoEffortless) return 'hard';

  const confidence = mastery?.confidence ?? 0;
  if (confidence >= 0.7) return 'hard';
  if (confidence > 0 && confidence < 0.2 && (mastery?.attempts ?? 0) >= 2)
    return 'easy';
  return 'base';
}

/** Did this stage feel effortless? Feeds momentum. */
export function wasEffortless(
  correct: boolean,
  attempts: number,
  support: SupportLevel,
): boolean {
  return correct && attempts === 1 && support === 'none';
}
