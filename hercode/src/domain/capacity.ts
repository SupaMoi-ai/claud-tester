import { capacityDescription, capacityLabel } from '../copy';
import type { CapacityLevel } from './types';

/** The single capacity enum. Labels come from copy.ts, so there is one map. */

export const CAPACITY_LEVELS: CapacityLevel[] = ['minimum', 'light', 'normal', 'high'];

export const CAPACITY_LABEL = capacityLabel;
export const CAPACITY_DESCRIPTION = capacityDescription;

/** How many non-essential tasks the plan surfaces at each level. */
export const PRIMARY_SLOTS: Record<CapacityLevel, number> = {
  minimum: 0,
  light: 1,
  normal: 3,
  high: 3,
};

/** Only 'high' offers an optional stretch task on top of Today's 3. */
export function allowsStretch(capacity: CapacityLevel): boolean {
  return capacity === 'high';
}

/** Bare minimum hides non-essential reminders. */
export function suppressesReminders(capacity: CapacityLevel): boolean {
  return capacity === 'minimum';
}

/** Maps a 1-5 self-report onto the enum, used by check-in and daily review. */
export function capacityFromScore(score: number): CapacityLevel {
  if (score <= 1) return 'minimum';
  if (score === 2) return 'light';
  if (score <= 4) return 'normal';
  return 'high';
}

export function capacityToScore(capacity: CapacityLevel): number {
  switch (capacity) {
    case 'minimum':
      return 1;
    case 'light':
      return 2;
    case 'normal':
      return 3;
    case 'high':
      return 5;
  }
}
