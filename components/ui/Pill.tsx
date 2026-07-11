import { StyleSheet, Text, View } from "react-native";
import { radii, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";

interface PillProps {
  label: string;
  color: string;
  tint: string;
}

export function Pill({ label, color, tint }: PillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: tint }]}>
      <Text style={[textStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.inner,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
});
