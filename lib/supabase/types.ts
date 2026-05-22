// Hand-written types matching the migrations. Replace with
// `supabase gen types typescript` output once the project is linked.

export type IntentType =
  | "outfit_inspiration"
  | "garment_construction"
  | "fabric_or_material"
  | "color_palette"
  | "interior_styling"
  | "diy_project"
  | "craft_technique"
  | "food"
  | "kid_project"
  | "beauty_or_grooming"
  | "art_or_illustration"
  | "photography_mood"
  | "travel_or_place"
  | "general_aesthetic"
  | "unclear";

export type Mood =
  | "warm_earthy"
  | "cool_minimal"
  | "playful_bright"
  | "moody_dark"
  | "vintage_faded"
  | "soft_romantic"
  | "utilitarian"
  | "editorial_clean"
  | "cozy_textured"
  | "unclear";

export type Actionability =
  | "reference_only"
  | "needs_materials"
  | "needs_pattern_or_instructions"
  | "ready_to_attempt"
  | "finished_example";

export type Energy = "growing" | "stagnant" | "ready" | "exploratory";

export type ProjectStatus = "active" | "parked" | "finished";

export interface PinRow {
  id: string;
  user_id: string;
  pinterest_pin_id: string;
  image_url: string;
  source_url: string | null;
  pinterest_description: string | null;
  pinterest_board_name: string | null;
  saved_at: string | null;
  clip_embedding: number[] | null;
  intent_type: IntentType | null;
  primary_subject: string | null;
  materials: string[] | null;
  techniques: string[] | null;
  dominant_colors: string[] | null;
  mood: Mood | null;
  era_or_style: string | null;
  actionability: Actionability | null;
  saved_signal_strength: number | null;
  enrichment_confidence: number | null;
  enriched_at: string | null;
  project_id: string | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  seed_pin_id: string;
  label: string;
  explanation: string | null;
  intent_type: IntentType | null;
  dominant_palette: string[] | null;
  tiny_next_step: string | null;
  energy: Energy | null;
  confidence: number | null;
  status: ProjectStatus;
  excluded_pin_ids: string[] | null;
  position_x: number | null;
  position_y: number | null;
  last_touched_at: string;
  created_at: string;
}

export interface PinterestConnectionRow {
  user_id: string;
  pinterest_user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  last_pin_sync_at: string | null;
  last_passive_scan_at: string | null;
  created_at: string;
}

export interface SyncJobRow {
  id: string;
  user_id: string;
  kind: "embed" | "enrich";
  payload: Record<string, unknown>;
  status: "pending" | "running" | "done" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
