import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFamilyStore } from "@/lib/store/familyStore";
import { useRecurringBagItems } from "@/lib/store/queries";
import {
  addCustodyOverride,
  addMember,
  addRecurringBagItem,
  deleteBagItem,
  deleteCustodyOverride,
  saveCustodyPattern,
} from "@/lib/store/mutations";
import { Home, resolveHome } from "@/lib/custody/resolveHome";
import { formatWeekday } from "@/lib/format/nb";
import { colors, radii, spacing } from "@/lib/theme/tokens";
import { homeColor, homeLabel, homeTintColor, textStyles } from "@/lib/theme/typography";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { HairlineDivider } from "@/components/ui/HairlineDivider";
import { Pill } from "@/components/ui/Pill";

const GRID_LENGTH = 14;

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default function Innstillinger() {
  const {
    family,
    members,
    custodyPattern,
    custodyPatternId,
    custodyOverrideRows,
    initialize,
  } = useFamilyStore();
  const recurringBagItems = useRecurringBagItems(family?.id);

  useEffect(() => {
    if (!family) initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Custody pattern editor state ---
  const [draftPattern, setDraftPattern] = useState<Home[]>(
    Array.from({ length: GRID_LENGTH }, (_, i) => (i < 7 ? "pappa" : "mamma"))
  );
  const [anchorDateText, setAnchorDateText] = useState("");
  const [handoverTimeText, setHandoverTimeText] = useState("16:00");
  const [patternError, setPatternError] = useState<string | null>(null);
  const [savingPattern, setSavingPattern] = useState(false);

  useEffect(() => {
    if (!custodyPattern) return;
    const padded = Array.from(
      { length: GRID_LENGTH },
      (_, i) => custodyPattern.pattern[i % custodyPattern.pattern.length] ?? "pappa"
    );
    setDraftPattern(padded);
    setAnchorDateText(custodyPattern.anchorDate);
    setHandoverTimeText(custodyPattern.handoverTime.slice(0, 5));
  }, [custodyPattern]);

  const preview = useMemo(() => {
    if (!isValidIsoDate(anchorDateText) || !isValidTime(handoverTimeText)) return null;
    const draft = { pattern: draftPattern, anchorDate: anchorDateText, handoverTime: handoverTimeText };
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const at = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const resolved = resolveHome(at, draft, []);
      return { label: formatWeekday(at), home: resolved.home };
    });
  }, [draftPattern, anchorDateText, handoverTimeText]);

  async function savePattern() {
    if (!family) return;
    if (!isValidIsoDate(anchorDateText)) {
      setPatternError("Ankerdato må være på formatet ÅÅÅÅ-MM-DD.");
      return;
    }
    if (!isValidTime(handoverTimeText)) {
      setPatternError("Byttetidspunkt må være på formatet TT:MM.");
      return;
    }
    setPatternError(null);
    setSavingPattern(true);
    try {
      await saveCustodyPattern(
        family.id,
        custodyPatternId,
        draftPattern,
        anchorDateText,
        `${handoverTimeText}:00`
      );
      await initialize();
    } catch (err) {
      setPatternError(err instanceof Error ? err.message : "Kunne ikke lagre bytteplanen.");
    } finally {
      setSavingPattern(false);
    }
  }

  // --- Overrides ---
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideHome, setOverrideHome] = useState<Home>("mamma");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  async function submitOverride() {
    if (!family) return;
    if (!isValidIsoDate(overrideDate)) {
      setOverrideError("Dato må være på formatet ÅÅÅÅ-MM-DD.");
      return;
    }
    setOverrideError(null);
    try {
      await addCustodyOverride(family.id, overrideDate, overrideHome, overrideNote.trim() || null);
      setOverrideDate("");
      setOverrideNote("");
      await initialize();
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : "Kunne ikke legge til unntak.");
    }
  }

  // --- Members ---
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"parent" | "child">("child");
  const [newMemberHome, setNewMemberHome] = useState<Home>("mamma");
  const [memberError, setMemberError] = useState<string | null>(null);

  async function submitMember() {
    if (!family) return;
    if (!newMemberName.trim()) {
      setMemberError("Navn er påkrevd.");
      return;
    }
    setMemberError(null);
    try {
      await addMember(
        family.id,
        newMemberName.trim(),
        newMemberRole,
        newMemberRole === "parent" ? newMemberHome : null,
        homeColor(newMemberRole === "parent" ? newMemberHome : "begge")
      );
      setNewMemberName("");
      await initialize();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Kunne ikke legge til medlem.");
    }
  }

  // --- Recurring bag items ---
  const [newItemName, setNewItemName] = useState("");
  const [newItemFor, setNewItemFor] = useState<string | null>(null);
  const [newItemTravelsTo, setNewItemTravelsTo] = useState<Home | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const kids = members.filter((m) => m.role === "child");

  async function submitRecurringItem() {
    if (!family) return;
    if (!newItemName.trim()) {
      setItemError("Navn er påkrevd.");
      return;
    }
    setItemError(null);
    try {
      await addRecurringBagItem(family.id, newItemName.trim(), newItemFor, newItemTravelsTo);
      setNewItemName("");
      recurringBagItems.refetch();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : "Kunne ikke legge til gjenstand.");
    }
  }

  if (!family) {
    return (
      <View style={styles.centered}>
        <Text style={textStyles.body}>Laster innstillinger...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={textStyles.heading1}>Innstillinger</Text>

      <Card>
        <Text style={textStyles.label}>Familiemedlemmer</Text>
        <View style={styles.list}>
          {members.map((member, index) => (
            <View key={member.id}>
              {index > 0 && <HairlineDivider />}
              <View style={styles.memberRow}>
                <Text style={textStyles.bodyMedium}>{member.display_name}</Text>
                <Text style={textStyles.caption}>
                  {member.role === "parent" ? "Forelder" : "Barn"}
                  {member.home ? ` · ${homeLabel(member.home)}` : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <HairlineDivider />
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Navn"
            placeholderTextColor={colors.ink3}
            value={newMemberName}
            onChangeText={setNewMemberName}
          />
          <View style={styles.chipsRow}>
            <Chip
              label="Barn"
              selected={newMemberRole === "child"}
              onPress={() => setNewMemberRole("child")}
            />
            <Chip
              label="Forelder"
              selected={newMemberRole === "parent"}
              onPress={() => setNewMemberRole("parent")}
            />
          </View>
          {newMemberRole === "parent" && (
            <View style={styles.chipsRow}>
              <Chip
                label="Mamma"
                selected={newMemberHome === "mamma"}
                onPress={() => setNewMemberHome("mamma")}
              />
              <Chip
                label="Pappa"
                selected={newMemberHome === "pappa"}
                onPress={() => setNewMemberHome("pappa")}
              />
            </View>
          )}
          {memberError && <Text style={styles.errorText}>{memberError}</Text>}
          <Button label="Legg til medlem" onPress={submitMember} variant="secondary" />
        </View>
      </Card>

      <Card>
        <Text style={textStyles.label}>Bytteplan</Text>
        <Text style={textStyles.caption}>
          Trykk på en dag for å bytte mellom Mamma og Pappa. Mønsteret gjentar seg.
        </Text>

        <View style={styles.grid}>
          {draftPattern.map((home, index) => (
            <Chip
              key={index}
              label={`${index + 1}: ${home === "mamma" ? "M" : "P"}`}
              selected={home === "mamma"}
              onPress={() =>
                setDraftPattern((prev) =>
                  prev.map((h, i) => (i === index ? (h === "mamma" ? "pappa" : "mamma") : h))
                )
              }
            />
          ))}
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Ankerdato (ÅÅÅÅ-MM-DD)"
            placeholderTextColor={colors.ink3}
            value={anchorDateText}
            onChangeText={setAnchorDateText}
          />
          <TextInput
            style={styles.input}
            placeholder="Byttetidspunkt (TT:MM)"
            placeholderTextColor={colors.ink3}
            value={handoverTimeText}
            onChangeText={setHandoverTimeText}
          />
        </View>

        {preview && (
          <View style={styles.previewList}>
            <Text style={textStyles.label}>Forhåndsvisning, neste 7 dager</Text>
            {preview.map((day, index) => (
              <View key={index} style={styles.previewRow}>
                <Text style={textStyles.caption}>{day.label}</Text>
                <Pill
                  label={homeLabel(day.home)}
                  color={homeColor(day.home)}
                  tint={homeTintColor(day.home)}
                />
              </View>
            ))}
          </View>
        )}

        {patternError && <Text style={styles.errorText}>{patternError}</Text>}
        <Button label="Lagre bytteplan" onPress={savePattern} disabled={savingPattern} />
      </Card>

      <Card>
        <Text style={textStyles.label}>Unntak (byttehelg m.m.)</Text>
        <View style={styles.list}>
          {custodyOverrideRows.map((override, index) => (
            <View key={override.id}>
              {index > 0 && <HairlineDivider />}
              <View style={styles.overrideRow}>
                <View>
                  <Text style={textStyles.bodyMedium}>
                    {override.date} → {homeLabel(override.home)}
                  </Text>
                  {override.note && <Text style={textStyles.caption}>{override.note}</Text>}
                </View>
                <Text
                  style={styles.deleteLink}
                  onPress={() => deleteCustodyOverride(override.id).then(() => initialize())}
                >
                  Fjern
                </Text>
              </View>
            </View>
          ))}
        </View>

        <HairlineDivider />
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Dato (ÅÅÅÅ-MM-DD)"
            placeholderTextColor={colors.ink3}
            value={overrideDate}
            onChangeText={setOverrideDate}
          />
          <View style={styles.chipsRow}>
            <Chip
              label="Mamma"
              selected={overrideHome === "mamma"}
              onPress={() => setOverrideHome("mamma")}
            />
            <Chip
              label="Pappa"
              selected={overrideHome === "pappa"}
              onPress={() => setOverrideHome("pappa")}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Notat (valgfritt)"
            placeholderTextColor={colors.ink3}
            value={overrideNote}
            onChangeText={setOverrideNote}
          />
          {overrideError && <Text style={styles.errorText}>{overrideError}</Text>}
          <Button label="Legg til unntak" onPress={submitOverride} variant="secondary" />
        </View>
      </Card>

      <Card>
        <Text style={textStyles.label}>Faste ting i reisesekken</Text>
        <View style={styles.list}>
          {recurringBagItems.data.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <HairlineDivider />}
              <View style={styles.overrideRow}>
                <Text style={textStyles.bodyMedium}>{item.name}</Text>
                <Text
                  style={styles.deleteLink}
                  onPress={() => deleteBagItem(item.id).then(() => recurringBagItems.refetch())}
                >
                  Fjern
                </Text>
              </View>
            </View>
          ))}
        </View>

        <HairlineDivider />
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Navn (f.eks. Lader)"
            placeholderTextColor={colors.ink3}
            value={newItemName}
            onChangeText={setNewItemName}
          />
          {kids.length > 0 && (
            <View style={styles.chipsRow}>
              {kids.map((kid) => (
                <Chip
                  key={kid.id}
                  label={kid.display_name}
                  selected={newItemFor === kid.id}
                  onPress={() => setNewItemFor(newItemFor === kid.id ? null : kid.id)}
                />
              ))}
            </View>
          )}
          <View style={styles.chipsRow}>
            <Chip
              label="→ Mamma"
              selected={newItemTravelsTo === "mamma"}
              onPress={() => setNewItemTravelsTo(newItemTravelsTo === "mamma" ? null : "mamma")}
            />
            <Chip
              label="→ Pappa"
              selected={newItemTravelsTo === "pappa"}
              onPress={() => setNewItemTravelsTo(newItemTravelsTo === "pappa" ? null : "pappa")}
            />
          </View>
          {itemError && <Text style={styles.errorText}>{itemError}</Text>}
          <Button label="Legg til gjenstand" onPress={submitRecurringItem} variant="secondary" />
        </View>
      </Card>
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
  list: {
    marginTop: spacing.md,
  },
  memberRow: {
    paddingVertical: spacing.sm,
    gap: 2,
  },
  overrideRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  deleteLink: {
    ...textStyles.caption,
    color: colors.terra,
  },
  form: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  input: {
    borderRadius: radii.inner,
    borderWidth: 1,
    borderColor: colors.ink3,
    padding: spacing.md,
    ...textStyles.body,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    ...textStyles.caption,
    color: colors.terra,
  },
});
