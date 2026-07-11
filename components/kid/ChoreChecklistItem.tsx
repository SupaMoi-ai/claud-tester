import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";

interface ChoreChecklistItemProps {
  title: string;
  hint: string | null;
  completed: boolean;
  onToggle: () => void;
}

export function ChoreChecklistItem({
  title,
  hint,
  completed,
  onToggle,
}: ChoreChecklistItemProps) {
  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <View style={[styles.checkbox, completed && styles.checkboxDone]}>
        {completed && <Text style={styles.check}>✓</Text>}
      </View>
      <View style={styles.text}>
        <Text style={[textStyles.bodyMedium, completed && styles.doneText]}>{title}</Text>
        {hint && <Text style={textStyles.caption}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radii.inner - 4,
    borderWidth: 1.5,
    borderColor: colors.ink3,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  check: {
    color: colors.surface,
    fontWeight: "700",
  },
  text: {
    flex: 1,
    gap: 2,
  },
  doneText: {
    color: colors.ink3,
    textDecorationLine: "line-through",
  },
});
