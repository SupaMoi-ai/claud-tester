import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { HairlineDivider } from "@/components/ui/HairlineDivider";
import { Pill } from "@/components/ui/Pill";
import { colors, spacing } from "@/lib/theme/tokens";
import { homeColor, homeLabel, homeTintColor, textStyles } from "@/lib/theme/typography";
import { HomeOrBegge } from "@/lib/custody/resolveHome";
import { formatLongDate, formatTime } from "@/lib/format/nb";

export interface AgendaEntry {
  id: string;
  title: string;
  startsAt: Date;
  home: HomeOrBegge | null;
  isHandover: boolean;
}

interface AgendaListProps {
  entries: AgendaEntry[];
}

export function AgendaList({ entries }: AgendaListProps) {
  return (
    <Card>
      <Text style={textStyles.label}>På agendaen</Text>
      <View style={styles.list}>
        {entries.map((entry, index) => (
          <View key={entry.id}>
            {index > 0 && <HairlineDivider />}
            <View style={styles.row}>
              <View style={styles.text}>
                <Text style={[textStyles.bodyMedium, entry.isHandover && { color: colors.plum }]}>
                  {entry.title}
                </Text>
                <Text style={textStyles.caption}>
                  {formatLongDate(entry.startsAt)} kl {formatTime(entry.startsAt)}
                </Text>
              </View>
              {entry.home && (
                <Pill
                  label={homeLabel(entry.home)}
                  color={entry.isHandover ? colors.plum : homeColor(entry.home)}
                  tint={entry.isHandover ? "#EFE7EF" : homeTintColor(entry.home)}
                />
              )}
            </View>
          </View>
        ))}
        {entries.length === 0 && (
          <Text style={textStyles.caption}>Ingenting i kalenderen ennå.</Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.md,
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
    gap: spacing.xs,
  },
});
