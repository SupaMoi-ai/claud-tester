import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { colors, radii, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";

interface FangKortProps {
  pendingCount: number;
}

export function FangKort({ pendingCount }: FangKortProps) {
  const router = useRouter();

  return (
    <Pressable onPress={() => router.push("/fang")}>
      <Card style={styles.card}>
        <View style={styles.text}>
          <Text style={textStyles.heading2}>Fang opp noe</Text>
          <Text style={textStyles.caption}>
            Ta et skjermbilde eller lim inn en tekst — Hjemmet lager en plan.
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: radii.inner,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: colors.surface,
    fontWeight: "700",
  },
});
