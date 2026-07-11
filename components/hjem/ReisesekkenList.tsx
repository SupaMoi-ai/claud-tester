import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { HairlineDivider } from "@/components/ui/HairlineDivider";
import { colors, spacing } from "@/lib/theme/tokens";
import { homeLabel, textStyles } from "@/lib/theme/typography";
import { Home } from "@/lib/custody/resolveHome";
import { formatWeekday } from "@/lib/format/nb";

export interface ReisesekkenItem {
  id: string;
  name: string;
  dueDate: Date | null;
}

interface ReisesekkenListProps {
  items: ReisesekkenItem[];
  travelsTo: Home;
  deadline: Date;
  onTogglePacked: (id: string) => void;
}

export function ReisesekkenList({
  items,
  travelsTo,
  deadline,
  onTogglePacked,
}: ReisesekkenListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <View style={styles.header}>
        <Text style={textStyles.label}>Reisesekken</Text>
        <Text style={textStyles.caption}>
          → {homeLabel(travelsTo)} · {formatWeekday(deadline)}
        </Text>
      </View>
      <View style={styles.list}>
        {items.map((item, index) => (
          <View key={item.id}>
            {index > 0 && <HairlineDivider />}
            <Pressable style={styles.row} onPress={() => onTogglePacked(item.id)}>
              <View style={styles.checkbox} />
              <Text style={textStyles.body}>{item.name}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  list: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.ink3,
  },
});
