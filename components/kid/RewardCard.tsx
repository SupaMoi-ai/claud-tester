import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";
import { RewardChoice } from "@/lib/supabase/types";

interface RewardCardProps {
  displayName: string;
  claimedChoice: RewardChoice | null;
  onChoose: (choice: RewardChoice) => void;
}

export function RewardCard({ displayName, claimedChoice, onChoose }: RewardCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={[textStyles.heading2, { color: colors.gold }]}>
        Godt jobba, {displayName}
      </Text>
      {claimedChoice ? (
        <Text style={textStyles.body}>
          Du valgte {claimedChoice === "screen" ? "skjermtid" : "lek ute"} i dag.
        </Text>
      ) : (
        <>
          <Text style={textStyles.body}>Alle oppgaver er ferdige. Velg belønningen din:</Text>
          <View style={styles.choices}>
            <Button label="Skjermtid" onPress={() => onChoose("screen")} style={styles.choice} />
            <Button
              label="Lek ute"
              variant="secondary"
              onPress={() => onChoose("play")}
              style={styles.choice}
            />
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.goldLt,
  },
  choices: {
    flexDirection: "row",
    gap: spacing.md,
  },
  choice: {
    flex: 1,
  },
});
