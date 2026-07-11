import { describe, expect, it } from "@jest/globals";
import { deriveBagItems } from "./deriveBagItems";

const fallback = { dueDateIso: "2026-07-09", travelsTo: "mamma" as const };

describe("deriveBagItems", () => {
  it("keeps an explicit due_date and travels_to as-is", () => {
    const result = deriveBagItems(
      [{ name: "Leggskinn", forKid: "Ellie", dueDate: "2026-07-14", travelsTo: "pappa" }],
      [],
      fallback
    );
    expect(result).toEqual([
      { name: "Leggskinn", forKidName: "Ellie", dueDate: "2026-07-14", travelsTo: "pappa" },
    ]);
  });

  it("defaults due_date to the next handover date when unspecified", () => {
    const result = deriveBagItems([{ name: "Sovepose", forKid: "Eliyah" }], [], fallback);
    expect(result[0]?.dueDate).toBe("2026-07-09");
  });

  it("infers travels_to from a related event's home when the item doesn't specify one", () => {
    const result = deriveBagItems(
      [{ name: "Fotballsko", forKid: "Ellie" }],
      [{ kidNames: ["Ellie"], home: "pappa", startsAtIso: "2026-07-14T17:00:00+02:00" }],
      fallback
    );
    expect(result[0]?.travelsTo).toBe("pappa");
  });

  it("infers due_date from a related event's start date when the item doesn't specify one", () => {
    const result = deriveBagItems(
      [{ name: "Fotballsko", forKid: "Ellie" }],
      [{ kidNames: ["Ellie"], home: "pappa", startsAtIso: "2026-07-14T17:00:00+02:00" }],
      fallback
    );
    expect(result[0]?.dueDate).toBe("2026-07-14");
  });

  it("falls back to the handover home when the related event is 'begge' (ambiguous)", () => {
    const result = deriveBagItems(
      [{ name: "Innesko", forKid: "Eliyah" }],
      [{ kidNames: ["Eliyah"], home: "begge" }],
      fallback
    );
    expect(result[0]?.travelsTo).toBe("mamma");
  });

  it("falls back to the handover home/date when there is no related event at all", () => {
    const result = deriveBagItems([{ name: "Skittentøy" }], [], fallback);
    expect(result[0]).toEqual({
      name: "Skittentøy",
      forKidName: undefined,
      dueDate: "2026-07-09",
      travelsTo: "mamma",
    });
  });

  it("explicit travels_to wins even when a related event suggests a different home", () => {
    const result = deriveBagItems(
      [{ name: "Ekstra genser", forKid: "Ellie", travelsTo: "mamma" }],
      [{ kidNames: ["Ellie"], home: "pappa" }],
      fallback
    );
    expect(result[0]?.travelsTo).toBe("mamma");
  });
});
