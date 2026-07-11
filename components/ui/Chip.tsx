import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[textStyles.bodyMedium, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.inner,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ink3,
  },
  chipSelected: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  labelSelected: {
    color: colors.surface,
  },
});
