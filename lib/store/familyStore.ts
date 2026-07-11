import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/types";
import { CustodyOverride, CustodyPattern } from "@/lib/custody/resolveHome";

interface FamilyState {
  loading: boolean;
  error: string | null;
  family: Tables<"families"> | null;
  members: Tables<"members">[];
  currentMember: Tables<"members"> | null;
  custodyPattern: CustodyPattern | null;
  custodyPatternId: string | null;
  custodyOverrides: CustodyOverride[];
  custodyOverrideRows: Tables<"custody_overrides">[];
  initialize: () => Promise<void>;
}

function toCustodyPattern(row: Tables<"custody_patterns">): CustodyPattern {
  return {
    pattern: row.pattern,
    anchorDate: row.anchor_date,
    handoverTime: row.handover_time,
  };
}

function toCustodyOverride(row: Tables<"custody_overrides">): CustodyOverride {
  return { date: row.date, home: row.home, note: row.note ?? undefined };
}

export const useFamilyStore = create<FamilyState>((set) => ({
  loading: false,
  error: null,
  family: null,
  members: [],
  currentMember: null,
  custodyPattern: null,
  custodyPatternId: null,
  custodyOverrides: [],
  custodyOverrideRows: [],

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Ingen innlogget bruker.");

      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (memberError) throw memberError;

      const [familyRes, membersRes, patternsRes, overridesRes] = await Promise.all([
        supabase.from("families").select("*").eq("id", member.family_id).single(),
        supabase.from("members").select("*").eq("family_id", member.family_id),
        supabase
          .from("custody_patterns")
          .select("*")
          .eq("family_id", member.family_id)
          .limit(1),
        supabase.from("custody_overrides").select("*").eq("family_id", member.family_id),
      ]);

      if (familyRes.error) throw familyRes.error;
      if (membersRes.error) throw membersRes.error;
      if (patternsRes.error) throw patternsRes.error;
      if (overridesRes.error) throw overridesRes.error;

      const patternRow = patternsRes.data?.[0];

      set({
        loading: false,
        error: null,
        family: familyRes.data,
        members: membersRes.data ?? [],
        currentMember: member,
        custodyPattern: patternRow ? toCustodyPattern(patternRow) : null,
        custodyPatternId: patternRow?.id ?? null,
        custodyOverrides: (overridesRes.data ?? []).map(toCustodyOverride),
        custodyOverrideRows: overridesRes.data ?? [],
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Ukjent feil ved lasting av familie.",
      });
    }
  },
}));
