import { describe, expect, it } from "@jest/globals";
import { captureResultSchema } from "@/lib/ai/captureResultSchema";
import { sampleCaptures, members, custodyPattern, ellieChores, eliyahChores } from "./fixtures";

describe("seed fixtures", () => {
  it("every sample capture's ai_result conforms to captureResultSchema", () => {
    for (const capture of sampleCaptures) {
      const result = captureResultSchema.safeParse(capture.ai_result);
      if (!result.success) {
        throw new Error(
          `Fixture for source "${capture.source}" failed schema validation: ${result.error.message}`
        );
      }
    }
  });

  it("has exactly 4 demo members (2 parents, 2 kids)", () => {
    expect(members).toHaveLength(4);
    expect(members.filter((m) => m.role === "parent")).toHaveLength(2);
    expect(members.filter((m) => m.role === "child")).toHaveLength(2);
  });

  it("custody pattern is a 7-day Mon-Thu pappa / Fri-Sun mamma cycle anchored on a Monday", () => {
    expect(custodyPattern.pattern).toEqual([
      "pappa",
      "pappa",
      "pappa",
      "pappa",
      "mamma",
      "mamma",
      "mamma",
    ]);
    expect(new Date(`${custodyPattern.anchor_date}T00:00:00Z`).getUTCDay()).toBe(1); // Monday
  });

  it("seeds the exact chore lists from the spec", () => {
    expect(ellieChores).toEqual([
      "Re opp sengen",
      "Rydd av frokostbordet",
      "Pakk fotballsekken",
      "Skittentøy i kurven",
      "Mat katten",
    ]);
    expect(eliyahChores).toEqual([
      "Re opp sengen",
      "Pakk leirskole-sekk",
      "Tøm søpla",
      "Sett skoene på plass",
    ]);
  });
});
