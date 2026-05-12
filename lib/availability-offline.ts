import { estimateOccupancyPure } from "./availability";
import type { OccupancyEstimate, ParkingListItem } from "./types";

export type OfflineQueuedReport = {
  locationId: string;
  occupancyPercent: number;
  createdAt: string;
};

export function predictOffline(
  item: ParkingListItem,
  queuedReports: OfflineQueuedReport[],
  now: Date,
): OccupancyEstimate {
  const reports = queuedReports
    .filter((r) => r.locationId === item.id)
    .map((r) => ({
      occupancyPercent: r.occupancyPercent,
      createdAt: new Date(r.createdAt),
    }));

  return estimateOccupancyPure(
    {
      location: {
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        parkingType: item.parkingType,
      },
      pattern: item.patternBlob
        ? { byWeekdayHour: item.patternBlob, confidence: 0.5 }
        : null,
      reports,
      nearbyEvents: [],
      trafficPressure: null,
    },
    now,
  );
}
