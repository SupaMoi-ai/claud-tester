import type { Home, HomeOrBegge } from "@/lib/custody/resolveHome";

export type { Home, HomeOrBegge };
export type MemberRole = "parent" | "child";
export type CaptureSource =
  | "spond"
  | "vigilo"
  | "mykid"
  | "kidplan"
  | "skole"
  | "vipps"
  | "annet";
export type CaptureStatus = "pending" | "analyzed" | "confirmed" | "dismissed";
export type MoneySplit = "50/50" | "mamma" | "pappa";
export type RewardChoice = "screen" | "play";

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["families"]["Insert"]>;
      };
      members: {
        Row: {
          id: string;
          family_id: string;
          user_id: string | null;
          display_name: string;
          role: MemberRole;
          home: Home | null;
          color: string | null;
          pin: string | null;
          push_token: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          user_id?: string | null;
          display_name: string;
          role: MemberRole;
          home?: Home | null;
          color?: string | null;
          pin?: string | null;
          push_token?: string | null;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
      };
      custody_patterns: {
        Row: {
          id: string;
          family_id: string;
          pattern: Home[];
          anchor_date: string;
          handover_time: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          pattern: Home[];
          anchor_date: string;
          handover_time?: string;
        };
        Relationships: [];
        Update: Partial<
          Database["public"]["Tables"]["custody_patterns"]["Insert"]
        >;
      };
      custody_overrides: {
        Row: {
          id: string;
          family_id: string;
          date: string;
          home: Home;
          note: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          date: string;
          home: Home;
          note?: string | null;
        };
        Relationships: [];
        Update: Partial<
          Database["public"]["Tables"]["custody_overrides"]["Insert"]
        >;
      };
      captures: {
        Row: {
          id: string;
          family_id: string;
          created_by: string;
          source: CaptureSource | null;
          raw_text: string | null;
          image_path: string | null;
          status: CaptureStatus;
          ai_result: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          created_by: string;
          source?: CaptureSource | null;
          raw_text?: string | null;
          image_path?: string | null;
          status?: CaptureStatus;
          ai_result?: unknown | null;
          created_at?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["captures"]["Insert"]>;
      };
      events: {
        Row: {
          id: string;
          family_id: string;
          capture_id: string | null;
          title: string;
          starts_at: string;
          ends_at: string | null;
          location: string | null;
          member_ids: string[] | null;
          home: HomeOrBegge | null;
          source: string | null;
          reminder_minutes: number;
        };
        Insert: {
          id?: string;
          family_id: string;
          capture_id?: string | null;
          title: string;
          starts_at: string;
          ends_at?: string | null;
          location?: string | null;
          member_ids?: string[] | null;
          home?: HomeOrBegge | null;
          source?: string | null;
          reminder_minutes?: number;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      bag_items: {
        Row: {
          id: string;
          family_id: string;
          capture_id: string | null;
          event_id: string | null;
          name: string;
          for_member: string | null;
          travels_to: Home | null;
          due_date: string | null;
          packed: boolean;
          recurring: boolean;
        };
        Insert: {
          id?: string;
          family_id: string;
          capture_id?: string | null;
          event_id?: string | null;
          name: string;
          for_member?: string | null;
          travels_to?: Home | null;
          due_date?: string | null;
          packed?: boolean;
          recurring?: boolean;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["bag_items"]["Insert"]>;
      };
      money_items: {
        Row: {
          id: string;
          family_id: string;
          capture_id: string | null;
          title: string;
          amount_nok: number;
          vipps_number: string | null;
          due_date: string | null;
          split: MoneySplit;
          paid_mamma: boolean;
          paid_pappa: boolean;
        };
        Insert: {
          id?: string;
          family_id: string;
          capture_id?: string | null;
          title: string;
          amount_nok: number;
          vipps_number?: string | null;
          due_date?: string | null;
          split?: MoneySplit;
          paid_mamma?: boolean;
          paid_pappa?: boolean;
        };
        Relationships: [];
        Update: Partial<
          Database["public"]["Tables"]["money_items"]["Insert"]
        >;
      };
      chores: {
        Row: {
          id: string;
          family_id: string;
          member_id: string;
          title: string;
          hint: string | null;
          points: number;
          home: HomeOrBegge;
          recurring_days: number[] | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          family_id: string;
          member_id: string;
          title: string;
          hint?: string | null;
          points?: number;
          home?: HomeOrBegge;
          recurring_days?: number[] | null;
          active?: boolean;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["chores"]["Insert"]>;
      };
      chore_completions: {
        Row: {
          id: string;
          chore_id: string;
          member_id: string;
          date: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          chore_id: string;
          member_id: string;
          date: string;
          completed_at?: string;
        };
        Relationships: [];
        Update: Partial<
          Database["public"]["Tables"]["chore_completions"]["Insert"]
        >;
      };
      reward_claims: {
        Row: {
          id: string;
          member_id: string;
          date: string;
          choice: RewardChoice | null;
          claimed_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          date: string;
          choice?: RewardChoice | null;
          claimed_at?: string;
        };
        Relationships: [];
        Update: Partial<
          Database["public"]["Tables"]["reward_claims"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
