import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";
import { CaptureChoreSuggestion } from "@/lib/ai/captureResultSchema";

export function ChoreSuggestionReviewRow({ item }: { item: CaptureChoreSuggestion }) {
  return (
    <View style={styles.row}>
      <Text style={textStyles.bodyMedium}>
        {item.title} — {item.kid_name}
      </Text>
      {item.hint && <Text style={textStyles.caption}>{item.hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm,
    gap: 2,
  },
});
