import { describe, expect, it } from "@jest/globals";
import { CustodyPattern, Home, resolveHome } from "./resolveHome";

// Mon-Thu pappa, Fri-Sun mamma, handover 16:00. Anchor 2026-07-06 is a Monday.
const DEMO_PATTERN: CustodyPattern = {
  pattern: ["pappa", "pappa", "pappa", "pappa", "mamma", "mamma", "mamma"],
  anchorDate: "2026-07-06",
  handoverTime: "16:00",
};

describe("resolveHome", () => {
  it("resolves a plain day within the pattern, no override", () => {
    const result = resolveHome(
      new Date("2026-07-07T10:00:00+02:00"), // Tuesday, deep in pappa stretch
      DEMO_PATTERN,
      []
    );
    expect(result).toEqual({ home: "pappa", source: "pattern", isHandoverDay: false });
  });

  it("lets an override win even when the pattern disagrees", () => {
    const overrides = [
      { date: "2026-07-07", home: "mamma" as Home, note: "Byttehelg" },
    ];
    const result = resolveHome(
      new Date("2026-07-07T10:00:00+02:00"), // pattern says pappa
      DEMO_PATTERN,
      overrides
    );
    expect(result.home).toBe("mamma");
    expect(result.source).toBe("override");
  });

  it("on a handover day, before handoverTime returns the previous home", () => {
    const result = resolveHome(
      new Date("2026-07-09T15:59:00+02:00"), // Thursday 15:59
      DEMO_PATTERN,
      []
    );
    expect(result).toEqual({ home: "pappa", source: "pattern", isHandoverDay: true });
  });

  it("on a handover day, after handoverTime returns the next home", () => {
    const result = resolveHome(
      new Date("2026-07-09T16:01:00+02:00"), // Thursday 16:01
      DEMO_PATTERN,
      []
    );
    expect(result).toEqual({ home: "mamma", source: "pattern", isHandoverDay: true });
  });

  it("exactly at handoverTime returns the next home (documented boundary)", () => {
    const result = resolveHome(
      new Date("2026-07-09T16:00:00+02:00"),
      DEMO_PATTERN,
      []
    );
    expect(result.home).toBe("mamma");
  });

  it("ignores time of day entirely on a non-handover day", () => {
    const morning = resolveHome(new Date("2026-07-07T00:00:01+02:00"), DEMO_PATTERN, []);
    const night = resolveHome(new Date("2026-07-07T23:59:00+02:00"), DEMO_PATTERN, []);
    expect(morning.home).toBe("pappa");
    expect(night.home).toBe("pappa");
    expect(morning.isHandoverDay).toBe(false);
  });

  it("also treats the mamma-to-pappa turnover (Sun->Mon) as a handover day", () => {
    const beforeSundayHandover = resolveHome(
      new Date("2026-07-12T10:00:00+02:00"), // Sunday morning, still mamma
      DEMO_PATTERN,
      []
    );
    const afterSundayHandover = resolveHome(
      new Date("2026-07-12T17:00:00+02:00"), // Sunday after 16:00 -> pappa
      DEMO_PATTERN,
      []
    );
    expect(beforeSundayHandover).toEqual({
      home: "mamma",
      source: "pattern",
      isHandoverDay: true,
    });
    expect(afterSundayHandover.home).toBe("pappa");
  });

  it("cycles the pattern correctly across 7/14/28-day boundaries from the anchor", () => {
    expect(resolveHome(new Date("2026-07-13T10:00:00+02:00"), DEMO_PATTERN, []).home).toBe(
      "pappa"
    );
    expect(resolveHome(new Date("2026-07-20T10:00:00+02:00"), DEMO_PATTERN, []).home).toBe(
      "pappa"
    );
    expect(resolveHome(new Date("2026-08-03T10:00:00+02:00"), DEMO_PATTERN, []).home).toBe(
      "pappa"
    );
  });

  it("resolves the anchor date itself to pattern[0]", () => {
    const result = resolveHome(new Date("2026-07-06T10:00:00+02:00"), DEMO_PATTERN, []);
    expect(result.home).toBe("pappa");
  });

  it("is idempotent under modulo for dates far before the anchor", () => {
    const oneCycleBefore = resolveHome(
      new Date("2026-06-29T10:00:00+02:00"), // 7 days before anchor, also a Monday
      DEMO_PATTERN,
      []
    );
    const manyCyclesBefore = resolveHome(
      new Date("2026-01-05T10:00:00+01:00"), // ~26 weeks before anchor, also a Monday, winter offset
      DEMO_PATTERN,
      []
    );
    expect(oneCycleBefore.home).toBe("pappa");
    expect(manyCyclesBefore.home).toBe("pappa");
  });

  it("is generic over pattern length, not hardcoded to 7 or 14 days", () => {
    const fourteenDayPattern: CustodyPattern = {
      pattern: [
        "pappa", "pappa", "pappa", "pappa", "pappa", "pappa", "pappa",
        "mamma", "mamma", "mamma", "mamma", "mamma", "mamma", "mamma",
      ],
      anchorDate: "2026-07-06",
      handoverTime: "16:00",
    };
    // Day 7 (index 6) is still within the first pappa week.
    expect(
      resolveHome(new Date("2026-07-12T10:00:00+02:00"), fourteenDayPattern, []).home
    ).toBe("pappa");
    // Day 8 (index 7) starts the mamma week.
    expect(
      resolveHome(new Date("2026-07-13T10:00:00+02:00"), fourteenDayPattern, []).home
    ).toBe("mamma");
    // Day 15 (index 0 again, cycle length 14) is back to pappa.
    expect(
      resolveHome(new Date("2026-07-20T10:00:00+02:00"), fourteenDayPattern, []).home
    ).toBe("pappa");
  });
});
