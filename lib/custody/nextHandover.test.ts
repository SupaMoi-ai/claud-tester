import { describe, expect, it } from "@jest/globals";
import { CustodyPattern } from "./resolveHome";
import { nextHandover } from "./nextHandover";

// Mon-Thu pappa, Fri-Sun mamma, handover 16:00. Anchor 2026-07-06 is a Monday.
const DEMO_PATTERN: CustodyPattern = {
  pattern: ["pappa", "pappa", "pappa", "pappa", "mamma", "mamma", "mamma"],
  anchorDate: "2026-07-06",
  handoverTime: "16:00",
};

describe("nextHandover", () => {
  it("finds Thursday 16:00 (pappa -> mamma) from earlier in the pappa stretch", () => {
    const result = nextHandover(new Date("2026-07-07T10:00:00+02:00"), DEMO_PATTERN, []);
    expect(result.at.toISOString()).toBe("2026-07-09T14:00:00.000Z"); // Thu 16:00 CEST
    expect(result.from).toBe("pappa");
    expect(result.to).toBe("mamma");
  });

  it("finds Sunday 16:00 (mamma -> pappa) from earlier in the mamma stretch", () => {
    const result = nextHandover(new Date("2026-07-10T09:00:00+02:00"), DEMO_PATTERN, []);
    expect(result.at.toISOString()).toBe("2026-07-12T14:00:00.000Z"); // Sun 16:00 CEST
    expect(result.from).toBe("mamma");
    expect(result.to).toBe("pappa");
  });

  it("skips to the following handover when now is exactly at a handover instant", () => {
    const result = nextHandover(new Date("2026-07-09T14:00:00.000Z"), DEMO_PATTERN, []); // Thu 16:00 CEST exactly
    expect(result.at.toISOString()).toBe("2026-07-12T14:00:00.000Z"); // Sun 16:00, not Thursday's own
  });

  it("honors an override that shifts a handover to a different date/home", () => {
    const overrides = [{ date: "2026-07-08", home: "mamma" as const, note: "Byttehelg" }];
    // Pattern says Wed 07-08 is pappa; override makes it mamma, so Tue(pappa)->Wed(mamma)
    // becomes the next handover instead of Thu->Fri.
    const result = nextHandover(new Date("2026-07-07T10:00:00+02:00"), DEMO_PATTERN, overrides);
    expect(result.at.toISOString()).toBe("2026-07-07T14:00:00.000Z"); // Tue 16:00 CEST, the day BEFORE the override date
    expect(result.from).toBe("pappa");
    expect(result.to).toBe("mamma");
  });

  it("throws if no handover occurs within the lookahead window (stuck pattern)", () => {
    const stuckPattern: CustodyPattern = {
      pattern: ["mamma"],
      anchorDate: "2026-07-06",
      handoverTime: "16:00",
    };
    expect(() => nextHandover(new Date("2026-07-07T10:00:00+02:00"), stuckPattern, [])).toThrow();
  });
});
