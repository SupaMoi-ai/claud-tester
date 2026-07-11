import { StyleSheet, View, ViewProps } from "react-native";
import { border, colors, radii, spacing } from "@/lib/theme/tokens";

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: border.hairline,
    padding: spacing.lg,
  },
});
