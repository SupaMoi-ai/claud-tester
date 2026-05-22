import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { vision, llm } from "@/lib/providers";
import type { PinRow, ProjectRow } from "@/lib/supabase/types";
import { findNeighbors } from "./findNeighbors";
import type { EnrichedSeed } from "@/lib/providers/llm/interface";

const ENRICH_BATCH_SIZE = 10;

export interface CreateProjectResult {
  project: ProjectRow;
  included: string[];
  excluded: string[];
}

// User-triggered: turn a seed pin into a project.
//   1. Find ≤ 30 nearest neighbours (cosine sim > 0.65)
//   2. Enrich seed + neighbours in parallel batches of 10
//   3. Ask the LLM to assemble the project
//   4. Persist project, update pins.project_id and enriched fields
export async function createProjectFromPin(
  userId: string,
  seedPinId: string
): Promise<CreateProjectResult> {
  const supabase = createSupabaseServiceClient();

  // Load seed
  const { data: seed, error: seedErr } = await supabase
    .from("pins")
    .select("*")
    .eq("id", seedPinId)
    .eq("user_id", userId)
    .maybeSingle();
  if (seedErr) throw seedErr;
  if (!seed) throw new Error("Seed pin not found");

  // Neighbours
  const neighbors = await findNeighbors(userId, seedPinId, 30);

  // Enrich seed + neighbours
  const visionP = vision();
  const enrich = async (
    pinId: string,
    image_url: string,
    desc: string | null,
    board: string | null
  ): Promise<EnrichedSeed> => {
    const e = await visionP.enrichPin({
      pinterest_pin_id: pinId,
      image_url,
      pinterest_description: desc,
      pinterest_board_name: board,
    });
    return { pin_id: pinId, ...e };
  };

  const seedEnriched = await enrich(
    seed.id,
    seed.image_url,
    seed.pinterest_description,
    seed.pinterest_board_name
  );

  const candEnriched: EnrichedSeed[] = [];
  for (let i = 0; i < neighbors.length; i += ENRICH_BATCH_SIZE) {
    const slice = neighbors.slice(i, i + ENRICH_BATCH_SIZE);
    const results = await Promise.all(
      slice.map((n) =>
        enrich(n.id, n.image_url, n.pinterest_description, n.pinterest_board_name)
      )
    );
    candEnriched.push(...results);
  }

  // Ask LLM to assemble.
  const projectShape = await llm().buildProject(seedEnriched, candEnriched);

  // Persist enrichment back to pins.
  const enrichedById = new Map<string, EnrichedSeed>();
  enrichedById.set(seedEnriched.pin_id, seedEnriched);
  for (const c of candEnriched) enrichedById.set(c.pin_id, c);

  // Insert project first so we have an id to link to.
  const { data: created, error: projErr } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      seed_pin_id: seed.id,
      label: projectShape.label,
      explanation: projectShape.explanation,
      intent_type: projectShape.intent_type,
      dominant_palette: projectShape.dominant_palette,
      tiny_next_step: projectShape.tiny_next_step,
      energy: projectShape.energy,
      confidence: projectShape.confidence,
      excluded_pin_ids: projectShape.excluded_pin_ids,
      position_x: seed.position_x,
      position_y: seed.position_y,
    })
    .select("*")
    .single();
  if (projErr) throw projErr;
  if (!created) throw new Error("Failed to create project");

  // Update the included pins.
  const now = new Date().toISOString();
  for (const pinId of projectShape.included_pin_ids) {
    const e = enrichedById.get(pinId);
    if (!e) continue;
    await supabase
      .from("pins")
      .update({
        project_id: created.id,
        intent_type: e.intent_type,
        primary_subject: e.primary_subject,
        materials: e.materials,
        techniques: e.techniques,
        dominant_colors: e.dominant_colors,
        mood: e.mood,
        era_or_style: e.era_or_style,
        actionability: e.actionability,
        saved_signal_strength: e.saved_signal_strength,
        enrichment_confidence: e.confidence,
        enriched_at: now,
      })
      .eq("id", pinId)
      .eq("user_id", userId);
  }

  return {
    project: created as ProjectRow,
    included: projectShape.included_pin_ids,
    excluded: projectShape.excluded_pin_ids,
  };
}
