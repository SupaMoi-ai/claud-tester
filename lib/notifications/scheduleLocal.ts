import * as Notifications from "expo-notifications";
import { Home } from "@/lib/custody/resolveHome";
import { addDaysIso, osloDateTimeToUtc, toOsloParts } from "@/lib/custody/osloTime";

/** 19:00 the night before a handover. */
export function computeHandoverReminderTime(handoverAt: Date): Date {
  const { date } = toOsloParts(handoverAt);
  const dayBefore = addDaysIso(date, -1);
  return osloDateTimeToUtc(dayBefore, "19:00");
}

/** `reminderMinutes` before an event starts. */
export function computeEventReminderTime(startsAt: Date, reminderMinutes: number): Date {
  return new Date(startsAt.getTime() - reminderMinutes * 60_000);
}

/** 08:00 Oslo local time on the due date. */
export function computeVippsReminderTime(dueDateIso: string): Date {
  return osloDateTimeToUtc(dueDateIso, "08:00");
}

async function scheduleAt(title: string, body: string, at: Date): Promise<string | null> {
  if (at.getTime() <= Date.now()) {
    return null; // never schedule a notification for a moment already in the past
  }
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
}

export function scheduleHandoverReminder(
  handoverAt: Date,
  travelsTo: Home,
  itemCount: number
): Promise<string | null> {
  const at = computeHandoverReminderTime(handoverAt);
  const homeLabel = travelsTo === "mamma" ? "Mamma" : "Pappa";
  return scheduleAt(
    "Reisesekken",
    `${itemCount} ting må pakkes før byttet i morgen til ${homeLabel}.`,
    at
  );
}

export function scheduleEventReminder(
  title: string,
  startsAt: Date,
  reminderMinutes: number
): Promise<string | null> {
  const at = computeEventReminderTime(startsAt, reminderMinutes);
  return scheduleAt(title, `Starter om ${reminderMinutes} minutter.`, at);
}

export function scheduleVippsReminder(
  title: string,
  amountNok: number,
  dueDateIso: string
): Promise<string | null> {
  const at = computeVippsReminderTime(dueDateIso);
  return scheduleAt("Frist i dag", `${title}: kr ${amountNok}`, at);
}
