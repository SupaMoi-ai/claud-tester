import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { spacing } from "@/lib/theme/tokens";
import { homeColor, homeLabel, homeTintColor, textStyles } from "@/lib/theme/typography";
import { HomeOrBegge } from "@/lib/custody/resolveHome";

interface BarnIDagCardProps {
  displayName: string;
  avatarColor: string;
  todayHome: HomeOrBegge;
  choresCompleted: number;
  choresTotal: number;
  nextEventTitle: string | null;
}

export function BarnIDagCard({
  displayName,
  avatarColor,
  todayHome,
  choresCompleted,
  choresTotal,
  nextEventTitle,
}: BarnIDagCardProps) {
  return (
    <Card style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarInitial}>{displayName.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={textStyles.bodyMedium}>{displayName}</Text>
        <Pill
          label={homeLabel(todayHome)}
          color={homeColor(todayHome)}
          tint={homeTintColor(todayHome)}
        />
        {nextEventTitle && <Text style={textStyles.caption}>{nextEventTitle}</Text>}
      </View>
      <ProgressRing completed={choresCompleted} total={choresTotal} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
});
