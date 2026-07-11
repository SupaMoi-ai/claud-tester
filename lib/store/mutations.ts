import { supabase } from "@/lib/supabase/client";
import { Home, MemberRole, RewardChoice } from "@/lib/supabase/types";

export async function setBagItemPacked(id: string, packed: boolean): Promise<void> {
  const { error } = await supabase.from("bag_items").update({ packed }).eq("id", id);
  if (error) throw error;
}

export async function completeChore(
  choreId: string,
  memberId: string,
  dateIso: string
): Promise<void> {
  const { error } = await supabase
    .from("chore_completions")
    .insert({ chore_id: choreId, member_id: memberId, date: dateIso });
  if (error) throw error;
}

export async function uncompleteChore(
  choreId: string,
  memberId: string,
  dateIso: string
): Promise<void> {
  const { error } = await supabase
    .from("chore_completions")
    .delete()
    .eq("chore_id", choreId)
    .eq("member_id", memberId)
    .eq("date", dateIso);
  if (error) throw error;
}

export async function setMoneyItemPaid(id: string, side: Home, paid: boolean): Promise<void> {
  const update = side === "mamma" ? { paid_mamma: paid } : { paid_pappa: paid };
  const { error } = await supabase.from("money_items").update(update).eq("id", id);
  if (error) throw error;
}

export async function claimReward(
  memberId: string,
  dateIso: string,
  choice: RewardChoice
): Promise<void> {
  const { error } = await supabase
    .from("reward_claims")
    .insert({ member_id: memberId, date: dateIso, choice });
  if (error) throw error;
}

export async function saveCustodyPattern(
  familyId: string,
  existingId: string | null,
  pattern: Home[],
  anchorDate: string,
  handoverTime: string
): Promise<void> {
  if (existingId) {
    const { error } = await supabase
      .from("custody_patterns")
      .update({ pattern, anchor_date: anchorDate, handover_time: handoverTime })
      .eq("id", existingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("custody_patterns").insert({
      family_id: familyId,
      pattern,
      anchor_date: anchorDate,
      handover_time: handoverTime,
    });
    if (error) throw error;
  }
}

export async function addCustodyOverride(
  familyId: string,
  date: string,
  home: Home,
  note: string | null
): Promise<void> {
  const { error } = await supabase
    .from("custody_overrides")
    .insert({ family_id: familyId, date, home, note });
  if (error) throw error;
}

export async function deleteCustodyOverride(id: string): Promise<void> {
  const { error } = await supabase.from("custody_overrides").delete().eq("id", id);
  if (error) throw error;
}

export async function addMember(
  familyId: string,
  displayName: string,
  role: MemberRole,
  home: Home | null,
  color: string | null
): Promise<void> {
  const { error } = await supabase
    .from("members")
    .insert({ family_id: familyId, display_name: displayName, role, home, color });
  if (error) throw error;
}

export async function addRecurringBagItem(
  familyId: string,
  name: string,
  forMember: string | null,
  travelsTo: Home | null
): Promise<void> {
  const { error } = await supabase.from("bag_items").insert({
    family_id: familyId,
    name,
    for_member: forMember,
    travels_to: travelsTo,
    recurring: true,
  });
  if (error) throw error;
}

export async function deleteBagItem(id: string): Promise<void> {
  const { error } = await supabase.from("bag_items").delete().eq("id", id);
  if (error) throw error;
}
