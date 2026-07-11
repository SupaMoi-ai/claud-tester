import { describe, expect, it } from "@jest/globals";
import { splitAmount } from "./splitAmount";

describe("splitAmount", () => {
  it("splits an even amount evenly 50/50", () => {
    expect(splitAmount(150, "50/50")).toEqual({ mamma: 75, pappa: 75 });
  });

  it("gives the extra krone to mamma on an odd 50/50 amount", () => {
    expect(splitAmount(151, "50/50")).toEqual({ mamma: 76, pappa: 75 });
  });

  it("always sums back to the original amount", () => {
    for (const amount of [0, 1, 2, 99, 100, 151, 1000]) {
      const { mamma, pappa } = splitAmount(amount, "50/50");
      expect(mamma + pappa).toBe(amount);
    }
  });

  it("assigns the full amount to mamma when split is 'mamma'", () => {
    expect(splitAmount(150, "mamma")).toEqual({ mamma: 150, pappa: 0 });
  });

  it("assigns the full amount to pappa when split is 'pappa'", () => {
    expect(splitAmount(150, "pappa")).toEqual({ mamma: 0, pappa: 150 });
  });
});
