import { describe, expect, it } from "@jest/globals";
import {
  computeEventReminderTime,
  computeHandoverReminderTime,
  computeVippsReminderTime,
} from "./scheduleLocal";

describe("computeHandoverReminderTime", () => {
  it("fires at 19:00 Oslo time the night before a summer (CEST) handover", () => {
    const handoverAt = new Date("2026-07-09T14:00:00.000Z"); // Thu 16:00 CEST
    const reminder = computeHandoverReminderTime(handoverAt);
    expect(reminder.toISOString()).toBe("2026-07-08T17:00:00.000Z"); // Wed 19:00 CEST
  });

  it("fires at 19:00 Oslo time the night before a winter (CET) handover", () => {
    const handoverAt = new Date("2026-01-08T15:00:00.000Z"); // Thu 16:00 CET
    const reminder = computeHandoverReminderTime(handoverAt);
    expect(reminder.toISOString()).toBe("2026-01-07T18:00:00.000Z"); // Wed 19:00 CET
  });

  it("rolls back across a month boundary correctly", () => {
    const handoverAt = new Date("2026-08-01T14:00:00.000Z"); // Sat, CEST
    const reminder = computeHandoverReminderTime(handoverAt);
    expect(reminder.toISOString()).toBe("2026-07-31T17:00:00.000Z");
  });
});

describe("computeEventReminderTime", () => {
  it("subtracts reminder_minutes from starts_at", () => {
    const startsAt = new Date("2026-07-14T15:00:00.000Z");
    expect(computeEventReminderTime(startsAt, 60).toISOString()).toBe(
      "2026-07-14T14:00:00.000Z"
    );
    expect(computeEventReminderTime(startsAt, 0).toISOString()).toBe(
      "2026-07-14T15:00:00.000Z"
    );
  });
});

describe("computeVippsReminderTime", () => {
  it("fires at 08:00 Oslo time on the due date", () => {
    expect(computeVippsReminderTime("2026-09-05").toISOString()).toBe(
      "2026-09-05T06:00:00.000Z" // CEST
    );
    expect(computeVippsReminderTime("2026-01-05").toISOString()).toBe(
      "2026-01-05T07:00:00.000Z" // CET
    );
  });
});
