import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/types";
import {
  FAMILY_ID,
  MEMBER_IDS,
  family,
  members,
  custodyPattern,
  ellieChores,
  eliyahChores,
  sampleCaptures,
} from "./fixtures";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.example to .env and fill in real Supabase credentials before running `npm run seed`."
  );
  process.exit(1);
}

// Service-role client: bypasses RLS, must never run on-device. Node-only script.
const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function resetDemoFamily() {
  const memberIds = Object.values(MEMBER_IDS);

  await supabase.from("chore_completions").delete().in("member_id", memberIds);
  await supabase.from("reward_claims").delete().in("member_id", memberIds);
  await supabase.from("bag_items").delete().eq("family_id", FAMILY_ID);
  await supabase.from("money_items").delete().eq("family_id", FAMILY_ID);
  await supabase.from("events").delete().eq("family_id", FAMILY_ID);
  await supabase.from("captures").delete().eq("family_id", FAMILY_ID);
  await supabase.from("chores").delete().eq("family_id", FAMILY_ID);
  await supabase.from("custody_overrides").delete().eq("family_id", FAMILY_ID);
  await supabase.from("custody_patterns").delete().eq("family_id", FAMILY_ID);
}

async function seed() {
  console.log(`Seeding demo family "${family.name}" (${FAMILY_ID})...`);

  await resetDemoFamily();

  const { error: familyError } = await supabase.from("families").upsert(family);
  if (familyError) throw familyError;

  const { error: membersError } = await supabase.from("members").upsert(members);
  if (membersError) throw membersError;

  const { error: patternError } = await supabase
    .from("custody_patterns")
    .insert(custodyPattern);
  if (patternError) throw patternError;

  const chores = [
    ...ellieChores.map((title) => ({
      family_id: FAMILY_ID,
      member_id: MEMBER_IDS.ellie,
      title,
      home: "begge" as const,
    })),
    ...eliyahChores.map((title) => ({
      family_id: FAMILY_ID,
      member_id: MEMBER_IDS.eliyah,
      title,
      home: "begge" as const,
    })),
  ];
  const { error: choresError } = await supabase.from("chores").insert(chores);
  if (choresError) throw choresError;

  for (const sample of sampleCaptures) {
    const { data: capture, error: captureError } = await supabase
      .from("captures")
      .insert({
        family_id: FAMILY_ID,
        created_by: MEMBER_IDS.thomas,
        source: sample.source,
        raw_text: sample.raw_text,
        status: "confirmed",
        ai_result: sample.ai_result,
      })
      .select()
      .single();
    if (captureError) throw captureError;

    const kidNameToId: Record<string, string> = {
      Ellie: MEMBER_IDS.ellie,
      Eliyah: MEMBER_IDS.eliyah,
    };

    for (const event of sample.ai_result.events) {
      const { error: eventError } = await supabase.from("events").insert({
        family_id: FAMILY_ID,
        capture_id: capture.id,
        title: event.title,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        location: event.location,
        member_ids: (event.kid_names ?? [])
          .map((name) => kidNameToId[name])
          .filter((id): id is string => Boolean(id)),
        home: event.home_suggestion === "ukjent" ? null : event.home_suggestion,
        source: sample.source,
      });
      if (eventError) throw eventError;
    }

    for (const bagItem of sample.ai_result.bag_items) {
      const { error: bagItemError } = await supabase.from("bag_items").insert({
        family_id: FAMILY_ID,
        capture_id: capture.id,
        name: bagItem.name,
        for_member: bagItem.for_kid ? kidNameToId[bagItem.for_kid] : undefined,
        travels_to: bagItem.travels_to,
        due_date: bagItem.due_date,
      });
      if (bagItemError) throw bagItemError;
    }

    for (const moneyItem of sample.ai_result.money_items) {
      const { error: moneyItemError } = await supabase.from("money_items").insert({
        family_id: FAMILY_ID,
        capture_id: capture.id,
        title: moneyItem.title,
        amount_nok: moneyItem.amount_nok,
        vipps_number: moneyItem.vipps_number,
        due_date: moneyItem.due_date,
      });
      if (moneyItemError) throw moneyItemError;
    }
  }

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
