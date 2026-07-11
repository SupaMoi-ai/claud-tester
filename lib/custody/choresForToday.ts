import { HomeOrBegge } from "./resolveHome.ts";

export interface ChoreLike {
  id: string;
  home: HomeOrBegge;
  active: boolean;
}

/**
 * Chores visible for a kid today are the ones scoped to wherever the kid
 * actually is today (custody-aware), plus anything scoped to "begge".
 */
export function choresForToday<T extends ChoreLike>(
  chores: T[],
  todayHome: HomeOrBegge
): T[] {
  return chores.filter(
    (chore) => chore.active && (chore.home === todayHome || chore.home === "begge")
  );
}

export interface ChoreProgress {
  total: number;
  completed: number;
  isComplete: boolean;
}

export function choreProgress(totalChores: number, completedChoreIds: Set<string>): ChoreProgress {
  const completed = Math.min(completedChoreIds.size, totalChores);
  return {
    total: totalChores,
    completed,
    isComplete: totalChores > 0 && completed === totalChores,
  };
}
