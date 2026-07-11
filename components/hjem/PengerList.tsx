import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { HairlineDivider } from "@/components/ui/HairlineDivider";
import { colors, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";
import { splitAmount } from "@/lib/money/splitAmount";
import { MoneySplit } from "@/lib/supabase/types";

export interface PengerItem {
  id: string;
  title: string;
  amountNok: number;
  split: MoneySplit;
  dueDate: string | null;
  paidMamma: boolean;
  paidPappa: boolean;
}

interface PengerListProps {
  items: PengerItem[];
  onTogglePaid: (id: string, side: "mamma" | "pappa", paid: boolean) => void;
}

export function PengerList({ items, onTogglePaid }: PengerListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <Text style={textStyles.label}>Penger</Text>
      <View style={styles.list}>
        {items.map((item, index) => {
          const amounts = splitAmount(item.amountNok, item.split);
          return (
            <View key={item.id}>
              {index > 0 && <HairlineDivider />}
              <View style={styles.row}>
                <Text style={textStyles.bodyMedium}>{item.title}</Text>
                <Text style={textStyles.caption}>
                  Kr {item.amountNok} totalt
                  {item.dueDate ? ` · Frist ${item.dueDate}` : ""}
                </Text>
                <View style={styles.parties}>
                  <Pressable
                    style={styles.party}
                    onPress={() => onTogglePaid(item.id, "mamma", !item.paidMamma)}
                  >
                    <View style={[styles.checkbox, item.paidMamma && styles.checkboxDone]} />
                    <Text style={textStyles.caption}>Mamma kr {amounts.mamma}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.party}
                    onPress={() => onTogglePaid(item.id, "pappa", !item.paidPappa)}
                  >
                    <View style={[styles.checkbox, item.paidPappa && styles.checkboxDone]} />
                    <Text style={textStyles.caption}>Pappa kr {amounts.pappa}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.md,
  },
  row: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  parties: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  party: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.ink3,
  },
  checkboxDone: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
});
