import { describe, expect, it } from "@jest/globals";
import { choreProgress, choresForToday } from "./choresForToday";

describe("choresForToday", () => {
  const chores = [
    { id: "1", home: "pappa" as const, active: true },
    { id: "2", home: "mamma" as const, active: true },
    { id: "3", home: "begge" as const, active: true },
    { id: "4", home: "pappa" as const, active: false },
  ];

  it("includes chores scoped to today's home and to 'begge', excludes the other home", () => {
    const result = choresForToday(chores, "pappa");
    expect(result.map((c) => c.id).sort()).toEqual(["1", "3"]);
  });

  it("excludes inactive chores even if scoped to today's home", () => {
    const result = choresForToday(chores, "pappa");
    expect(result.some((c) => c.id === "4")).toBe(false);
  });
});

describe("choreProgress", () => {
  it("reports incomplete when some chores are unfinished", () => {
    const progress = choreProgress(3, new Set(["a"]));
    expect(progress).toEqual({ total: 3, completed: 1, isComplete: false });
  });

  it("reports complete only when every chore is done", () => {
    const progress = choreProgress(2, new Set(["a", "b"]));
    expect(progress).toEqual({ total: 2, completed: 2, isComplete: true });
  });

  it("treats zero chores as not complete (nothing to celebrate)", () => {
    const progress = choreProgress(0, new Set());
    expect(progress.isComplete).toBe(false);
  });
});
