import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { HairlineDivider } from "@/components/ui/HairlineDivider";
import { colors, spacing } from "@/lib/theme/tokens";
import { homeColor, homeLabel, homeTintColor, textStyles } from "@/lib/theme/typography";
import { Home } from "@/lib/custody/resolveHome";
import { formatCountdown, formatTime, formatWeekday } from "@/lib/format/nb";

interface KidTile {
  id: string;
  displayName: string;
  color: string;
}

interface HvemHarBarnaBandProps {
  currentHome: Home;
  kids: KidTile[];
  now: Date;
  nextHandoverAt: Date;
  nextHandoverTo: Home;
}

export function HvemHarBarnaBand({
  currentHome,
  kids,
  now,
  nextHandoverAt,
  nextHandoverTo,
}: HvemHarBarnaBandProps) {
  return (
    <Card>
      <Text style={textStyles.label}>Hvem har barna nå</Text>
      <Text style={[textStyles.heading1, styles.heroText, { color: homeColor(currentHome) }]}>
        Hos {homeLabel(currentHome)}
      </Text>
      <Text style={textStyles.caption}>
        Til {formatWeekday(nextHandoverAt)} kl {formatTime(nextHandoverAt)}
      </Text>

      <View style={styles.tiles}>
        {kids.map((kid) => (
          <View key={kid.id} style={styles.tileRow}>
            <View style={[styles.avatar, { backgroundColor: kid.color }]}>
              <Text style={styles.avatarInitial}>{kid.displayName.charAt(0)}</Text>
            </View>
            <Text style={textStyles.bodyMedium}>{kid.displayName}</Text>
          </View>
        ))}
      </View>

      <HairlineDivider />

      <View style={styles.footer}>
        <Text style={textStyles.body}>
          Neste bytte: {formatWeekday(nextHandoverAt)} kl {formatTime(nextHandoverAt)} →{" "}
          {homeLabel(nextHandoverTo)}
        </Text>
        <Pill
          label={formatCountdown(now, nextHandoverAt)}
          color={homeColor(nextHandoverTo)}
          tint={homeTintColor(nextHandoverTo)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heroText: {
    marginTop: spacing.xs,
  },
  tiles: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  tileRow: {
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: colors.surface,
    fontWeight: "600",
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
});
