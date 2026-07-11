import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";
import { CaptureMoneyItem } from "@/lib/ai/captureResultSchema";
import { splitAmount } from "@/lib/money/splitAmount";

export function MoneyItemReviewRow({ item }: { item: CaptureMoneyItem }) {
  const split = splitAmount(item.amount_nok, "50/50");

  return (
    <View style={styles.row}>
      <Text style={textStyles.bodyMedium}>{item.title}</Text>
      <Text style={textStyles.caption}>
        Kr {item.amount_nok} totalt · Kr {split.mamma} på Mamma, kr {split.pappa} på Pappa
      </Text>
      {item.due_date && <Text style={textStyles.caption}>Frist: {item.due_date}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm,
    gap: 2,
  },
});
