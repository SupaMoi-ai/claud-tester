import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/types";
import { choreProgress, choresForToday } from "@/lib/custody/choresForToday";
import { HomeOrBegge } from "@/lib/custody/resolveHome";

interface QueryState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useSupabaseQuery<T>(
  key: string,
  fetcher: () => Promise<{ data: T | null; error: { message: string } | null }>,
  initial: T,
  enabled: boolean
): QueryState<T> {
  const [state, setState] = useState<Omit<QueryState<T>, "refetch">>({
    data: initial,
    loading: enabled,
    error: null,
  });
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setState({ data: initial, loading: false, error: error.message });
      } else {
        setState({ data: data ?? initial, loading: false, error: null });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, refetchToken]);

  return { ...state, refetch: () => setRefetchToken((t) => t + 1) };
}

/** Next `limit` upcoming events for a family, ordered soonest first. */
export function useUpcomingEvents(familyId: string | undefined, limit = 5) {
  return useSupabaseQuery<Tables<"events">[]>(
    `events:${familyId}:${limit}`,
    async () => {
      const result = await supabase
        .from("events")
        .select("*")
        .eq("family_id", familyId as string)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(limit);
      return result;
    },
    [],
    Boolean(familyId)
  );
}

/** Events within an inclusive date range, for the /kalender week list. */
export function useEventsInRange(familyId: string | undefined, from: Date, to: Date) {
  return useSupabaseQuery<Tables<"events">[]>(
    `eventsRange:${familyId}:${from.toISOString()}:${to.toISOString()}`,
    async () => {
      const result = await supabase
        .from("events")
        .select("*")
        .eq("family_id", familyId as string)
        .gte("starts_at", from.toISOString())
        .lte("starts_at", to.toISOString())
        .order("starts_at", { ascending: true });
      return result;
    },
    [],
    Boolean(familyId)
  );
}

/** Count of captures still awaiting review, for the Fang-kort badge. */
export function usePendingCaptureCount(familyId: string | undefined) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(familyId));

  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("captures")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("status", "pending")
      .then(({ count: c }) => {
        if (!cancelled) {
          setCount(c ?? 0);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  return { count, loading };
}

/** Unpacked bag_items due before the next handover, for the Reisesekken widget. */
export function useReisesekkenItems(familyId: string | undefined, dueBefore: Date | null) {
  return useSupabaseQuery<Tables<"bag_items">[]>(
    `bag_items:${familyId}:${dueBefore?.toISOString() ?? ""}`,
    async () => {
      const result = await supabase
        .from("bag_items")
        .select("*")
        .eq("family_id", familyId as string)
        .eq("packed", false)
        .lte("due_date", (dueBefore as Date).toISOString().slice(0, 10))
        .order("due_date", { ascending: true });
      return result;
    },
    [],
    Boolean(familyId && dueBefore)
  );
}

/** Recurring bag item templates (e.g. lader, treningstøy), for the settings screen. */
export function useRecurringBagItems(familyId: string | undefined) {
  return useSupabaseQuery<Tables<"bag_items">[]>(
    `recurringBagItems:${familyId}`,
    async () => {
      const result = await supabase
        .from("bag_items")
        .select("*")
        .eq("family_id", familyId as string)
        .eq("recurring", true)
        .order("name", { ascending: true });
      return result;
    },
    [],
    Boolean(familyId)
  );
}

export interface KidChoreItem {
  id: string;
  title: string;
  hint: string | null;
  points: number;
  completed: boolean;
}

/** A single kid's chore checklist for today, custody-aware (home === today's home or 'begge'). */
export function useKidChores(memberId: string | undefined, todayHome: HomeOrBegge | null) {
  const todayIso = new Date().toISOString().slice(0, 10);

  return useSupabaseQuery<KidChoreItem[]>(
    `kidChores:${memberId}:${todayHome}:${todayIso}`,
    async () => {
      if (!memberId || !todayHome) return { data: [], error: null };

      const [choresRes, completionsRes] = await Promise.all([
        supabase.from("chores").select("*").eq("member_id", memberId).eq("active", true),
        supabase
          .from("chore_completions")
          .select("*")
          .eq("member_id", memberId)
          .eq("date", todayIso),
      ]);
      if (choresRes.error) return { data: null, error: choresRes.error };
      if (completionsRes.error) return { data: null, error: completionsRes.error };

      const visibleToday = choresForToday(choresRes.data ?? [], todayHome);
      const completedIds = new Set((completionsRes.data ?? []).map((c) => c.chore_id));

      return {
        data: visibleToday.map((chore) => ({
          id: chore.id,
          title: chore.title,
          hint: chore.hint,
          points: chore.points,
          completed: completedIds.has(chore.id),
        })),
        error: null,
      };
    },
    [],
    Boolean(memberId && todayHome)
  );
}

/** Whether (and how) a kid has already claimed today's reward. */
export function useTodayRewardClaim(memberId: string | undefined) {
  const todayIso = new Date().toISOString().slice(0, 10);

  return useSupabaseQuery<Tables<"reward_claims"> | null>(
    `rewardClaim:${memberId}:${todayIso}`,
    async () => {
      if (!memberId) return { data: null, error: null };
      const result = await supabase
        .from("reward_claims")
        .select("*")
        .eq("member_id", memberId)
        .eq("date", todayIso)
        .maybeSingle();
      return result;
    },
    null,
    Boolean(memberId)
  );
}

/** Money items with an outstanding balance (either side unpaid), soonest due first. */
export function useUnpaidMoneyItems(familyId: string | undefined) {
  return useSupabaseQuery<Tables<"money_items">[]>(
    `moneyItems:${familyId}`,
    async () => {
      const result = await supabase
        .from("money_items")
        .select("*")
        .eq("family_id", familyId as string)
        .or("paid_mamma.eq.false,paid_pappa.eq.false")
        .order("due_date", { ascending: true, nullsFirst: false });
      return result;
    },
    [],
    Boolean(familyId)
  );
}

export interface MemberChoreSummary {
  memberId: string;
  progress: ReturnType<typeof choreProgress>;
}

/** Today's chore completion progress for a set of kids, filtered by where each kid is today. */
export function useChoreProgressForMembers(
  familyId: string | undefined,
  memberHomes: { memberId: string; todayHome: HomeOrBegge }[]
) {
  const key = `chores:${familyId}:${memberHomes
    .map((m) => `${m.memberId}:${m.todayHome}`)
    .join(",")}`;

  return useSupabaseQuery<MemberChoreSummary[]>(
    key,
    async () => {
      if (!familyId || memberHomes.length === 0) {
        return { data: [], error: null };
      }
      const todayIso = new Date().toISOString().slice(0, 10);
      const memberIds = memberHomes.map((m) => m.memberId);

      const [choresRes, completionsRes] = await Promise.all([
        supabase.from("chores").select("*").eq("family_id", familyId).in("member_id", memberIds),
        supabase
          .from("chore_completions")
          .select("*")
          .in("member_id", memberIds)
          .eq("date", todayIso),
      ]);
      if (choresRes.error) return { data: null, error: choresRes.error };
      if (completionsRes.error) return { data: null, error: completionsRes.error };

      const summaries = memberHomes.map(({ memberId, todayHome }) => {
        const memberChores = (choresRes.data ?? []).filter((c) => c.member_id === memberId);
        const visibleToday = choresForToday(memberChores, todayHome);
        const completedIds = new Set(
          (completionsRes.data ?? [])
            .filter((c) => c.member_id === memberId)
            .map((c) => c.chore_id)
        );
        return {
          memberId,
          progress: choreProgress(visibleToday.length, completedIds),
        };
      });

      return { data: summaries, error: null };
    },
    [],
    Boolean(familyId) && memberHomes.length > 0
  );
}
