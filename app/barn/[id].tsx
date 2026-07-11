import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useFamilyStore } from "@/lib/store/familyStore";
import { useKidChores, useTodayRewardClaim } from "@/lib/store/queries";
import { completeChore, uncompleteChore, claimReward } from "@/lib/store/mutations";
import { resolveHome } from "@/lib/custody/resolveHome";
import { colors, spacing } from "@/lib/theme/tokens";
import { homeColor, homeLabel, homeTintColor, textStyles } from "@/lib/theme/typography";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ChoreChecklistItem } from "@/components/kid/ChoreChecklistItem";
import { ProgressMeter } from "@/components/kid/ProgressMeter";
import { RewardCard } from "@/components/kid/RewardCard";
import { RewardChoice } from "@/lib/supabase/types";

export default function BarnMode() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, error, members, custodyPattern, custodyOverrides, initialize } =
    useFamilyStore();
  const [now] = useState(() => new Date());

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kid = useMemo(() => members.find((m) => m.id === id), [members, id]);

  const resolved = useMemo(() => {
    if (!custodyPattern) return null;
    return resolveHome(now, custodyPattern, custodyOverrides);
  }, [custodyPattern, custodyOverrides, now]);

  const chores = useKidChores(kid?.id, resolved?.home ?? null);
  const reward = useTodayRewardClaim(kid?.id);

  const todayIso = now.toISOString().slice(0, 10);
  const completedCount = chores.data.filter((c) => c.completed).length;
  const isComplete = chores.data.length > 0 && completedCount === chores.data.length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.pine} />
      </View>
    );
  }

  if (error || !kid || !resolved) {
    return (
      <View style={styles.centered}>
        <Text style={textStyles.body}>Fant ikke barnet, eller familien er ikke lastet ennå.</Text>
      </View>
    );
  }

  const toDo = chores.data.filter((c) => !c.completed);
  const done = chores.data.filter((c) => c.completed);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.status}>
        <Text style={textStyles.heading1}>{kid.display_name}</Text>
        <Pill
          label={`Hos ${homeLabel(resolved.home)}`}
          color={homeColor(resolved.home)}
          tint={homeTintColor(resolved.home)}
        />
        <ProgressMeter completed={completedCount} total={chores.data.length} />
      </Card>

      {toDo.length > 0 && (
        <Card>
          <Text style={textStyles.label}>Å gjøre</Text>
          <View>
            {toDo.map((chore) => (
              <ChoreChecklistItem
                key={chore.id}
                title={chore.title}
                hint={chore.hint}
                completed={false}
                onToggle={() =>
                  completeChore(chore.id, kid.id, todayIso).then(() => chores.refetch())
                }
              />
            ))}
          </View>
        </Card>
      )}

      {done.length > 0 && (
        <Card>
          <Text style={textStyles.label}>Ferdig</Text>
          <View>
            {done.map((chore) => (
              <ChoreChecklistItem
                key={chore.id}
                title={chore.title}
                hint={chore.hint}
                completed
                onToggle={() =>
                  uncompleteChore(chore.id, kid.id, todayIso).then(() => chores.refetch())
                }
              />
            ))}
          </View>
        </Card>
      )}

      {isComplete && (
        <RewardCard
          displayName={kid.display_name}
          claimedChoice={reward.data?.choice ?? null}
          onChoose={(choice: RewardChoice) =>
            claimReward(kid.id, todayIso, choice).then(() => reward.refetch())
          }
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  status: {
    gap: spacing.md,
  },
});
