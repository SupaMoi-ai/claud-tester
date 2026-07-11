import { describe, expect, it } from "@jest/globals";
import { formatCountdown, formatLongDate, formatTime } from "./nb";

describe("formatCountdown", () => {
  const from = new Date("2026-07-09T12:00:00Z");

  it("formats a multi-day countdown", () => {
    expect(formatCountdown(from, new Date("2026-07-11T16:00:00Z"))).toBe("2 d 4 t");
  });

  it("formats an hours-only countdown", () => {
    expect(formatCountdown(from, new Date("2026-07-09T15:30:00Z"))).toBe("3 t 30 min");
  });

  it("formats a minutes-only countdown", () => {
    expect(formatCountdown(from, new Date("2026-07-09T12:45:00Z"))).toBe("45 min");
  });

  it("clamps a past target to 0 minutes rather than going negative", () => {
    expect(formatCountdown(from, new Date("2026-07-09T11:00:00Z"))).toBe("0 min");
  });
});

describe("nb-NO date formatting", () => {
  it("formats a long Norwegian date", () => {
    expect(formatLongDate(new Date("2026-07-09T10:00:00Z"))).toBe("torsdag 9. juli");
  });

  it("formats a 24h time in Oslo local time", () => {
    expect(formatTime(new Date("2026-07-09T14:00:00Z"))).toBe("16:00");
  });
});
