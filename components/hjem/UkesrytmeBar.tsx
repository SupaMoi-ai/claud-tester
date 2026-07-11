import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors, radii, spacing } from "@/lib/theme/tokens";
import { homeColor, textStyles } from "@/lib/theme/typography";
import { CustodyOverride, CustodyPattern, homeForDate } from "@/lib/custody/resolveHome";
import { addDaysIso, toOsloParts } from "@/lib/custody/osloTime";
import { formatWeekday } from "@/lib/format/nb";

interface UkesrytmeBarProps {
  now: Date;
  pattern: CustodyPattern;
  overrides: CustodyOverride[];
}

export function UkesrytmeBar({ now, pattern, overrides }: UkesrytmeBarProps) {
  const { date: todayIso } = toOsloParts(now);

  // Show the 7 days starting from the most recent Monday.
  const todayWeekday = new Date(`${todayIso}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  const isoWeekday = todayWeekday === 0 ? 7 : todayWeekday; // 1=Mon..7=Sun
  const mondayIso = addDaysIso(todayIso, -(isoWeekday - 1));

  const days = Array.from({ length: 7 }, (_, i) => {
    const dateIso = addDaysIso(mondayIso, i);
    const { home } = homeForDate(dateIso, pattern, overrides);
    return {
      dateIso,
      home,
      isToday: dateIso === todayIso,
      weekdayLabel: formatWeekday(new Date(`${dateIso}T12:00:00Z`), "short"),
    };
  });

  return (
    <Card>
      <Text style={textStyles.label}>Ukesrytme</Text>
      <View style={styles.row}>
        {days.map((day) => (
          <View key={day.dateIso} style={styles.dayColumn}>
            <View
              style={[
                styles.bar,
                { backgroundColor: homeColor(day.home) },
                day.isToday && styles.today,
              ]}
            />
            <Text style={[textStyles.caption, styles.weekday]}>{day.weekdayLabel}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  dayColumn: {
    alignItems: "center",
    gap: spacing.xs,
  },
  bar: {
    width: 24,
    height: 40,
    borderRadius: radii.inner / 2,
  },
  today: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  weekday: {
    textTransform: "capitalize",
  },
});
