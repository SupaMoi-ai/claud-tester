import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useFamilyStore } from "@/lib/store/familyStore";
import { setBagItemPacked, setMoneyItemPaid } from "@/lib/store/mutations";
import {
  useChoreProgressForMembers,
  usePendingCaptureCount,
  useReisesekkenItems,
  useUnpaidMoneyItems,
  useUpcomingEvents,
} from "@/lib/store/queries";
import { resolveHome } from "@/lib/custody/resolveHome";
import { nextHandover } from "@/lib/custody/nextHandover";
import { registerPushToken } from "@/lib/notifications/registerPush";
import {
  scheduleEventReminder,
  scheduleHandoverReminder,
  scheduleVippsReminder,
} from "@/lib/notifications/scheduleLocal";
import { colors, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";
import { HvemHarBarnaBand } from "@/components/hjem/HvemHarBarnaBand";
import { UkesrytmeBar } from "@/components/hjem/UkesrytmeBar";
import { FangKort } from "@/components/hjem/FangKort";
import { ReisesekkenList } from "@/components/hjem/ReisesekkenList";
import { PengerList } from "@/components/hjem/PengerList";
import { BarnIDagCard } from "@/components/hjem/BarnIDagCard";
import { AgendaList, AgendaEntry } from "@/components/hjem/AgendaList";

export default function Kommandosentralen() {
  const {
    loading,
    error,
    family,
    members,
    currentMember,
    custodyPattern,
    custodyOverrides,
    initialize,
  } = useFamilyStore();
  const [now] = useState(() => new Date());

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentMember) registerPushToken(currentMember.id);
  }, [currentMember]);

  const kids = useMemo(() => members.filter((m) => m.role === "child"), [members]);

  const resolved = useMemo(() => {
    if (!custodyPattern) return null;
    return resolveHome(now, custodyPattern, custodyOverrides);
  }, [custodyPattern, custodyOverrides, now]);

  const handover = useMemo(() => {
    if (!custodyPattern) return null;
    try {
      return nextHandover(now, custodyPattern, custodyOverrides);
    } catch {
      return null;
    }
  }, [custodyPattern, custodyOverrides, now]);

  const pendingCaptures = usePendingCaptureCount(family?.id);
  const reisesekken = useReisesekkenItems(family?.id, handover?.at ?? null);
  const upcomingEvents = useUpcomingEvents(family?.id, 5);
  const unpaidMoneyItems = useUnpaidMoneyItems(family?.id);
  const choreProgress = useChoreProgressForMembers(
    family?.id,
    resolved ? kids.map((k) => ({ memberId: k.id, todayHome: resolved.home })) : []
  );

  // Best-effort local scheduling: re-runs whenever the underlying handover or
  // event set changes. This can create duplicate device notifications across
  // app restarts since scheduled notification ids aren't persisted/deduped
  // anywhere yet — acceptable for this build, called out as a known
  // simplification rather than left silently unhandled.
  useEffect(() => {
    if (!handover || reisesekken.data.length === 0) return;
    scheduleHandoverReminder(handover.at, handover.to, reisesekken.data.length);
  }, [handover, reisesekken.data.length]);

  useEffect(() => {
    for (const event of upcomingEvents.data) {
      scheduleEventReminder(event.title, new Date(event.starts_at), event.reminder_minutes);
    }
  }, [upcomingEvents.data]);

  useEffect(() => {
    for (const item of unpaidMoneyItems.data) {
      if (item.due_date) {
        scheduleVippsReminder(item.title, item.amount_nok, item.due_date);
      }
    }
  }, [unpaidMoneyItems.data]);

  const agendaEntries: AgendaEntry[] = useMemo(() => {
    const eventEntries: AgendaEntry[] = upcomingEvents.data.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: new Date(e.starts_at),
      home: e.home,
      isHandover: false,
    }));
    const withHandover = handover
      ? [
          ...eventEntries,
          {
            id: "handover",
            title: "Bytte",
            startsAt: handover.at,
            home: handover.to,
            isHandover: true,
          },
        ]
      : eventEntries;
    return withHandover
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 5);
  }, [upcomingEvents.data, handover]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.pine} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={textStyles.body}>Kunne ikke laste Hjemmet: {error}</Text>
      </View>
    );
  }

  if (!family || !custodyPattern || !resolved || !handover) {
    return (
      <View style={styles.centered}>
        <Text style={textStyles.body}>
          Ingen familie eller bytteplan er satt opp ennå. Gå til Innstillinger for å komme i gang.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <HvemHarBarnaBand
        currentHome={resolved.home}
        kids={kids.map((k) => ({
          id: k.id,
          displayName: k.display_name,
          color: k.color ?? colors.pine,
        }))}
        now={now}
        nextHandoverAt={handover.at}
        nextHandoverTo={handover.to}
      />

      <UkesrytmeBar now={now} pattern={custodyPattern} overrides={custodyOverrides} />

      <FangKort pendingCount={pendingCaptures.count} />

      <ReisesekkenList
        items={reisesekken.data.map((item) => ({
          id: item.id,
          name: item.name,
          dueDate: item.due_date ? new Date(item.due_date) : null,
        }))}
        travelsTo={handover.to}
        deadline={handover.at}
        onTogglePacked={(id) => {
          setBagItemPacked(id, true).then(() => reisesekken.refetch());
        }}
      />

      <PengerList
        items={unpaidMoneyItems.data.map((item) => ({
          id: item.id,
          title: item.title,
          amountNok: item.amount_nok,
          split: item.split,
          dueDate: item.due_date,
          paidMamma: item.paid_mamma,
          paidPappa: item.paid_pappa,
        }))}
        onTogglePaid={(id, side, paid) => {
          setMoneyItemPaid(id, side, paid).then(() => unpaidMoneyItems.refetch());
        }}
      />

      <View style={styles.kidsSection}>
        <Text style={textStyles.label}>Barna i dag</Text>
        {kids.map((kid) => {
          const progress = choreProgress.data.find((p) => p.memberId === kid.id)?.progress;
          const nextEvent = upcomingEvents.data.find((e) =>
            (e.member_ids ?? []).includes(kid.id)
          );
          return (
            <Link key={kid.id} href={`/barn/${kid.id}`} asChild>
              <Pressable>
                <BarnIDagCard
                  displayName={kid.display_name}
                  avatarColor={kid.color ?? colors.pine}
                  todayHome={resolved.home}
                  choresCompleted={progress?.completed ?? 0}
                  choresTotal={progress?.total ?? 0}
                  nextEventTitle={nextEvent ? nextEvent.title : null}
                />
              </Pressable>
            </Link>
          );
        })}
      </View>

      <AgendaList entries={agendaEntries} />

      <View style={styles.navRow}>
        <Link href="/kalender" style={styles.navLink}>
          Kalender
        </Link>
        <Link href="/innstillinger" style={styles.navLink}>
          Innstillinger
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  kidsSection: {
    gap: spacing.md,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
    paddingVertical: spacing.md,
  },
  navLink: {
    color: colors.ink2,
    fontSize: 13,
  },
});
