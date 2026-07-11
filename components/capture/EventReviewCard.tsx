import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/lib/theme/tokens";
import { homeColor, homeLabel, homeTintColor, textStyles } from "@/lib/theme/typography";
import { HomeOrBegge } from "@/lib/custody/resolveHome";
import { CaptureEvent } from "@/lib/ai/captureResultSchema";
import { formatLongDateTime } from "@/lib/format/nb";
import { Pill } from "@/components/ui/Pill";

const HOME_CHOICES: HomeOrBegge[] = ["mamma", "pappa", "begge"];

interface EventReviewCardProps {
  event: CaptureEvent;
  selectedHome: HomeOrBegge;
  onChangeHome: (home: HomeOrBegge) => void;
}

export function EventReviewCard({ event, selectedHome, onChangeHome }: EventReviewCardProps) {
  return (
    <View style={styles.container}>
      <Text style={textStyles.bodyMedium}>{event.title}</Text>
      <Text style={textStyles.caption}>{formatLongDateTime(new Date(event.starts_at))}</Text>
      {event.location && <Text style={textStyles.caption}>{event.location}</Text>}

      <View style={styles.chips}>
        {HOME_CHOICES.map((home) => (
          <Pressable key={home} onPress={() => onChangeHome(home)}>
            <Pill
              label={homeLabel(home)}
              color={selectedHome === home ? colors.surface : homeColor(home)}
              tint={selectedHome === home ? homeColor(home) : homeTintColor(home)}
            />
          </Pressable>
        ))}
      </View>

      <Text style={styles.reason}>{event.home_reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  chips: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reason: {
    ...textStyles.caption,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
});
