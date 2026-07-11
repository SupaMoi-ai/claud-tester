import { describe, expect, it } from "@jest/globals";
import {
  addDaysIso,
  daysBetweenIso,
  osloDateTimeToUtc,
  toOsloParts,
} from "./osloTime";

describe("toOsloParts", () => {
  it("reads local Oslo date/time from a UTC instant in summer (CEST, UTC+2)", () => {
    const parts = toOsloParts(new Date("2026-07-09T14:00:00Z"));
    expect(parts).toEqual({ date: "2026-07-09", hour: 16, minute: 0 });
  });

  it("reads local Oslo date/time from a UTC instant in winter (CET, UTC+1)", () => {
    const parts = toOsloParts(new Date("2026-01-05T15:00:00Z"));
    expect(parts).toEqual({ date: "2026-01-05", hour: 16, minute: 0 });
  });
});

describe("osloDateTimeToUtc", () => {
  it("round-trips a summer local time (CEST, UTC+2)", () => {
    const utc = osloDateTimeToUtc("2026-07-09", "16:00");
    expect(utc.toISOString()).toBe("2026-07-09T14:00:00.000Z");
  });

  it("round-trips a winter local time (CET, UTC+1)", () => {
    const utc = osloDateTimeToUtc("2026-01-05", "16:00");
    expect(utc.toISOString()).toBe("2026-01-05T15:00:00.000Z");
  });

  it("round-trips correctly on either side of the spring-forward DST transition", () => {
    // 2026-03-29 is the EU spring-forward date (CET -> CEST).
    const beforeTransition = osloDateTimeToUtc("2026-03-28", "16:00");
    const afterTransition = osloDateTimeToUtc("2026-03-30", "16:00");
    expect(toOsloParts(beforeTransition)).toEqual({
      date: "2026-03-28",
      hour: 16,
      minute: 0,
    });
    expect(toOsloParts(afterTransition)).toEqual({
      date: "2026-03-30",
      hour: 16,
      minute: 0,
    });
  });
});

describe("addDaysIso", () => {
  it("adds positive and negative day offsets, crossing month/year boundaries", () => {
    expect(addDaysIso("2026-07-09", 1)).toBe("2026-07-10");
    expect(addDaysIso("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("daysBetweenIso", () => {
  it("computes whole-day differences in both directions", () => {
    expect(daysBetweenIso("2026-07-06", "2026-07-13")).toBe(7);
    expect(daysBetweenIso("2026-07-13", "2026-07-06")).toBe(-7);
    expect(daysBetweenIso("2026-07-06", "2026-07-06")).toBe(0);
  });
});
