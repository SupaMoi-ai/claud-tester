import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";

interface ProgressMeterProps {
  completed: number;
  total: number;
}

export function ProgressMeter({ completed, total }: ProgressMeterProps) {
  const fraction = total > 0 ? Math.min(completed / total, 1) : 0;
  const isComplete = total > 0 && completed >= total;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${fraction * 100}%`, backgroundColor: isComplete ? colors.gold : colors.pine },
          ]}
        />
      </View>
      <Text style={textStyles.caption}>
        {completed} av {total} gjort
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  track: {
    height: 10,
    borderRadius: radii.inner,
    backgroundColor: colors.pineLt,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.inner,
  },
});
