import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase/client";
import { useFamilyStore } from "@/lib/store/familyStore";
import { captureResultSchema } from "@/lib/ai/captureResultSchema";
import { HomeOrBegge } from "@/lib/custody/resolveHome";
import { nextHandover } from "@/lib/custody/nextHandover";
import { deriveBagItems, RelatedEvent, ReisesekkenFallback } from "@/lib/reisesekken/deriveBagItems";
import { toOsloParts } from "@/lib/custody/osloTime";
import { colors, spacing } from "@/lib/theme/tokens";
import { textStyles } from "@/lib/theme/typography";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HairlineDivider } from "@/components/ui/HairlineDivider";
import { EventReviewCard } from "@/components/capture/EventReviewCard";
import { BagItemReviewRow } from "@/components/capture/BagItemReviewRow";
import { MoneyItemReviewRow } from "@/components/capture/MoneyItemReviewRow";
import { ChoreSuggestionReviewRow } from "@/components/capture/ChoreSuggestionReviewRow";

export default function Gjennomgang() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { family, members, custodyPattern, custodyOverrides, initialize } = useFamilyStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [rawAiResult, setRawAiResult] = useState<unknown>(null);
  const [eventHomes, setEventHomes] = useState<HomeOrBegge[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!family) initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("captures")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          setError(fetchError?.message ?? "Fant ikke fangsten.");
          setLoading(false);
          return;
        }
        setCaptureId(data.id);
        setRawAiResult(data.ai_result);
        setLoading(false);
      });
  }, [id]);

  const parsed = useMemo(() => {
    if (!rawAiResult) return null;
    const result = captureResultSchema.safeParse(rawAiResult);
    return result.success ? result.data : null;
  }, [rawAiResult]);

  useEffect(() => {
    if (!parsed) return;
    setEventHomes(
      parsed.events.map((e) => (e.home_suggestion === "ukjent" ? "begge" : e.home_suggestion))
    );
  }, [parsed]);

  function kidIdByName(name: string | undefined): string | undefined {
    if (!name) return undefined;
    return members.find((m) => m.display_name === name)?.id;
  }

  async function confirm() {
    if (!parsed || !captureId || !family) return;
    setConfirming(true);
    setError(null);

    try {
      for (const [index, event] of parsed.events.entries()) {
        const memberIds = (event.kid_names ?? [])
          .map(kidIdByName)
          .filter((v): v is string => Boolean(v));
        const { error: insertError } = await supabase.from("events").insert({
          family_id: family.id,
          capture_id: captureId,
          title: event.title,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          location: event.location,
          member_ids: memberIds,
          home: eventHomes[index] ?? "begge",
        });
        if (insertError) throw insertError;
      }

      const relatedEvents: RelatedEvent[] = parsed.events.map((event, index) => ({
        kidNames: event.kid_names,
        home: eventHomes[index] ?? "begge",
        startsAtIso: event.starts_at,
      }));

      let bagItemFallback: ReisesekkenFallback = {
        dueDateIso: toOsloParts(new Date()).date,
        travelsTo: "mamma",
      };
      if (custodyPattern) {
        try {
          const handover = nextHandover(new Date(), custodyPattern, custodyOverrides);
          bagItemFallback = { dueDateIso: toOsloParts(handover.at).date, travelsTo: handover.to };
        } catch {
          // No handover found (e.g. a stuck pattern) — keep the today/mamma fallback above.
        }
      }

      const derivedBagItems = deriveBagItems(
        parsed.bag_items.map((b) => ({
          name: b.name,
          forKid: b.for_kid,
          dueDate: b.due_date,
          travelsTo: b.travels_to,
        })),
        relatedEvents,
        bagItemFallback
      );

      for (const bagItem of derivedBagItems) {
        const { error: insertError } = await supabase.from("bag_items").insert({
          family_id: family.id,
          capture_id: captureId,
          name: bagItem.name,
          for_member: kidIdByName(bagItem.forKidName),
          travels_to: bagItem.travelsTo,
          due_date: bagItem.dueDate,
        });
        if (insertError) throw insertError;
      }

      for (const moneyItem of parsed.money_items) {
        const { error: insertError } = await supabase.from("money_items").insert({
          family_id: family.id,
          capture_id: captureId,
          title: moneyItem.title,
          amount_nok: moneyItem.amount_nok,
          vipps_number: moneyItem.vipps_number,
          due_date: moneyItem.due_date,
        });
        if (insertError) throw insertError;
      }

      for (const suggestion of parsed.chore_suggestions) {
        const memberId = kidIdByName(suggestion.kid_name);
        if (!memberId) continue;
        const { error: insertError } = await supabase.from("chores").insert({
          family_id: family.id,
          member_id: memberId,
          title: suggestion.title,
          hint: suggestion.hint,
        });
        if (insertError) throw insertError;
      }

      const { error: statusError } = await supabase
        .from("captures")
        .update({ status: "confirmed" })
        .eq("id", captureId);
      if (statusError) throw statusError;

      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke lagre.");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.pine} />
      </View>
    );
  }

  if (error && !parsed) {
    return (
      <View style={styles.centered}>
        <Text style={textStyles.body}>{error}</Text>
      </View>
    );
  }

  if (!parsed) {
    return (
      <View style={styles.centered}>
        <Text style={textStyles.body}>Fangsten er ikke analysert ennå.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={textStyles.heading1}>Gjennomgang</Text>
      <Text style={textStyles.body}>{parsed.summary}</Text>

      {parsed.events.length > 0 && (
        <Card>
          <Text style={textStyles.label}>Hendelser</Text>
          {parsed.events.map((event, index) => (
            <View key={`${event.title}-${index}`}>
              {index > 0 && <HairlineDivider />}
              <EventReviewCard
                event={event}
                selectedHome={eventHomes[index] ?? "begge"}
                onChangeHome={(home) =>
                  setEventHomes((prev) => prev.map((h, i) => (i === index ? home : h)))
                }
              />
            </View>
          ))}
        </Card>
      )}

      {parsed.bag_items.length > 0 && (
        <Card>
          <Text style={textStyles.label}>Reisesekken</Text>
          {parsed.bag_items.map((item, index) => (
            <View key={`${item.name}-${index}`}>
              {index > 0 && <HairlineDivider />}
              <BagItemReviewRow item={item} />
            </View>
          ))}
        </Card>
      )}

      {parsed.money_items.length > 0 && (
        <Card>
          <Text style={textStyles.label}>Penger</Text>
          {parsed.money_items.map((item, index) => (
            <View key={`${item.title}-${index}`}>
              {index > 0 && <HairlineDivider />}
              <MoneyItemReviewRow item={item} />
            </View>
          ))}
        </Card>
      )}

      {parsed.chore_suggestions.length > 0 && (
        <Card>
          <Text style={textStyles.label}>Foreslåtte gjøremål</Text>
          {parsed.chore_suggestions.map((item, index) => (
            <View key={`${item.title}-${index}`}>
              {index > 0 && <HairlineDivider />}
              <ChoreSuggestionReviewRow item={item} />
            </View>
          ))}
        </Card>
      )}

      {error && <Text style={[textStyles.body, { color: colors.terra }]}>{error}</Text>}

      <Button label="Bekreft" onPress={confirm} disabled={confirming} />
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
});
