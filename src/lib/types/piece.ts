export type AttributionConfidence = "high" | "medium" | "low" | "speculative";

export type AuthState =
  | "pending"
  | "verified"
  | "rejected"
  | "needs_second_opinion";

export type AuthVerdict = "pass" | "fail" | "unclear" | "n/a";

export type ConditionGrade =
  | "deadstock"
  | "excellent"
  | "very good"
  | "good"
  | "fair";

export type FlawSeverity = "minor" | "moderate" | "major";

export type SourceChannel =
  | "Lorenzo"
  | "FINN"
  | "estate"
  | "auction"
  | "trade"
  | "walk-in"
  | "other";

export type ValuationMethod =
  | "comp-based"
  | "rule-adjusted"
  | "instinct"
  | "hybrid";

export type PieceStatus =
  | "intake"
  | "queued"
  | "listed"
  | "reserved"
  | "sold"
  | "returned"
  | "archived";

export type CompSource =
  | "Vestiaire"
  | "Grailed"
  | "eBay sold"
  | "Tise"
  | "QXL"
  | "FINN"
  | "other";

export type ListingPlatform =
  | "FINN"
  | "Tise"
  | "Paninaro"
  | "Instagram"
  | "Vestiaire"
  | "other";

export type PhotoType = "hero" | "label" | "detail" | "flaw" | "provenance";

export interface Flaw {
  area: string;
  severity: FlawSeverity;
  note: string;
}

export interface Comp {
  source: CompSource;
  url?: string;
  price_nok: number;
  condition: string;
  date_seen: string;
  notes: string;
}

export interface ListingChannel {
  platform: ListingPlatform;
  url?: string;
  listed_at: string;
  ask_nok: number;
  views?: number;
  inquiries?: number;
}

export interface Photo {
  url: string;
  type: PhotoType;
  caption?: string;
}

export interface Piece {
  id: string;
  created_at: string;
  updated_at: string;

  brand: string;
  designer?: string;
  category: string;
  garment_type?: string;
  size_label: string;
  size_modern_equivalent?: string;

  era_decade: string;
  era_year_estimate?: string;
  era_collection?: string;
  attribution_confidence: AttributionConfidence;

  auth_state: AuthState;
  auth_checklist: Record<string, AuthVerdict>;
  auth_notes: string;
  auth_reference_pieces: string[];

  condition_grade: ConditionGrade;
  condition_notes: string;
  flaws: Flaw[];

  fabric_primary: string;
  fabric_composition?: string;
  construction_notes?: string;

  source: SourceChannel;
  source_detail?: string;
  cost_nok: number;
  cost_eur?: number;
  acquired_at: string;

  valuation_floor_nok: number;
  valuation_target_nok: number;
  valuation_stretch_nok: number;
  valuation_method: ValuationMethod;
  valuation_explanation: string;
  comps: Comp[];

  status: PieceStatus;
  listed_on: ListingChannel[];
  sold_price_nok?: number;
  sold_at?: string;
  days_to_sell?: number;
  buyer_segment?: string;

  reference_tags: string[];
  trend_tags: string[];
  photos: Photo[];
}

export type PieceDraft = Omit<Piece, "id" | "created_at" | "updated_at">;

export interface ReferenceEntry {
  id: string;
}

export interface AuthChecklistTemplate {
  id: string;
}

export interface Trend {
  id: string;
}

export interface BrandProfile {
  id: string;
}
