export type ZoneStatus = "free" | "limited" | "restricted";

export type FreeWindow = {
  daysOfWeek: number[];
  startMinute: number;
  endMinute: number;
};

export type EnforcementWindow = {
  daysOfWeek: number[];
  startMinute: number;
  endMinute: number;
};

export type RuleDTO = {
  id: string;
  ruleTextOriginal: string;
  ruleTextSimple: string;
  freeWindow: FreeWindow | null;
  enforcementWindow: EnforcementWindow | null;
  maxStayMinutes: number | null;
  permitRequired: boolean;
  appliesDays: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
};

export type PriceDTO = {
  id: string;
  priceType: "HOURLY" | "DAILY" | "MONTHLY" | "EVENING" | "WEEKEND" | "FREE";
  amountNok: number;
  startsAt: string | null;
  endsAt: string | null;
  appliesDays: string | null;
  notes: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
};

export type ParkingLocationDTO = {
  id: string;
  slug: string;
  name: string;
  parkingType: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  capacityDisabled: number | null;
  capacityCharging: number | null;
  covered: boolean;
  operator: string | null;
  address: string | null;
  notes: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  confidenceScore: number;
  rules: RuleDTO[];
  prices: PriceDTO[];
};

export type OccupancyBreakdown = {
  historical?: { percent: number; weight: number };
  reports?: { percent: number; weight: number; sampleSize: number };
  eventUplift?: number;
  weatherUplift?: number;
  trafficUplift?: number;
  operatorLive?: number;
};

export type OccupancyEstimate = {
  percent: number;
  confidence: number;
  source: "historical" | "reports" | "blended" | "heuristic" | "operatorLive";
  breakdown: OccupancyBreakdown;
};

export type ParkingListItem = ParkingLocationDTO & {
  score: number;
  scoreBreakdown: Record<string, number>;
  walkingMeters: number | null;
  estimatedOccupancyPercent: number;
  occupancyConfidence: number;
  zoneStatus: ZoneStatus;
  isFreeNow: boolean;
  freeUntil: string | null;
  paidUntil: string | null;
  patternBlob?: number[];
};

export type LocalTipDTO = {
  id: string;
  title: string;
  body: string;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string | null;
};
