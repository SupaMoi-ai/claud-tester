import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFamilyStore } from "@/lib/store/familyStore";
import { useEventsInRange } from "@/lib/store/queries";
import { addDaysIso, toOsloParts } from "@/lib/custody/osloTime";
import { colors, spacing } from "@/lib/theme/tokens";
import { homeColor, homeLabel, homeTintColor, textStyles } from "@/lib/theme/typography";
import { formatLongDateTime } from "@/lib/format/nb";
import { Card } from "@/components/ui/Card";
import { HairlineDivider } from "@/components/ui/HairlineDivider";
import { Pill } from "@/components/ui/Pill";
import { Chip } from "@/components/ui/Chip";

function startOfWeek(now: Date): Date {
  const { date } = toOsloParts(now);
  const isoWeekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7; // 1=Mon..7=Sun
  const mondayIso = addDaysIso(date, -(isoWeekday - 1));
  return new Date(`${mondayIso}T00:00:00Z`);
}

export default function Kalender() {
  const { family, members, initialize } = useFamilyStore();
  const [now] = useState(() => new Date());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!family) initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekStart = useMemo(() => startOfWeek(now), [now]);
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000), [weekStart]);

  const events = useEventsInRange(family?.id, weekStart, weekEnd);

  const filteredEvents = useMemo(() => {
    if (!selectedMemberId) return events.data;
    return events.data.filter((e) => (e.member_ids ?? []).includes(selectedMemberId));
  }, [events.data, selectedMemberId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={textStyles.heading1}>Kalender</Text>
      <Text style={textStyles.caption}>Denne uken</Text>

      <View style={styles.chipsRow}>
        <Chip label="Alle" selected={selectedMemberId === null} onPress={() => setSelectedMemberId(null)} />
        {members.map((member) => (
          <Chip
            key={member.id}
            label={member.display_name}
            selected={selectedMemberId === member.id}
            onPress={() => setSelectedMemberId(member.id)}
          />
        ))}
      </View>

      <Card>
        <View>
          {filteredEvents.map((event, index) => (
            <View key={event.id}>
              {index > 0 && <HairlineDivider />}
              <View style={styles.row}>
                <View style={styles.text}>
                  <Text style={textStyles.bodyMedium}>{event.title}</Text>
                  <Text style={textStyles.caption}>
                    {formatLongDateTime(new Date(event.starts_at))}
                  </Text>
                  {event.location && <Text style={textStyles.caption}>{event.location}</Text>}
                </View>
                {event.home && (
                  <Pill
                    label={homeLabel(event.home)}
                    color={homeColor(event.home)}
                    tint={homeTintColor(event.home)}
                  />
                )}
              </View>
            </View>
          ))}
          {filteredEvents.length === 0 && (
            <Text style={textStyles.caption}>Ingen hendelser denne uken.</Text>
          )}
        </View>
      </Card>
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
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
