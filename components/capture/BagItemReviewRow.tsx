import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";
import { CaptureBagItem } from "@/lib/ai/captureResultSchema";

export function BagItemReviewRow({ item }: { item: CaptureBagItem }) {
  return (
    <View style={styles.row}>
      <Text style={textStyles.bodyMedium}>{item.name}</Text>
      <Text style={textStyles.caption}>
        {[item.for_kid, item.due_date].filter(Boolean).join(" · ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm,
    gap: 2,
  },
});
