/**
 * Deterministic pseudo-randomness. The 90 days of seed history must be the
 * same on every machine and every reload, otherwise Patterns would be showing
 * noise instead of a computed pattern.
 */

export interface Rng {
  /** [0, 1) */
  next(): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  /** True with the given probability. */
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

/** Turns any string into a 32-bit seed. */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough for seed data. */
export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
  };
}
