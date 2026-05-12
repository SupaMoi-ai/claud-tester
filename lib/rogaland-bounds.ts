export const ROGALAND_BBOX = {
  west: 5.0,
  south: 58.4,
  east: 7.4,
  north: 59.8,
} as const;

export const ROGALAND_MAX_BOUNDS: [[number, number], [number, number]] = [
  [ROGALAND_BBOX.west, ROGALAND_BBOX.south],
  [ROGALAND_BBOX.east, ROGALAND_BBOX.north],
];

export const ROGALAND_VIEWBOX = `${ROGALAND_BBOX.west},${ROGALAND_BBOX.north},${ROGALAND_BBOX.east},${ROGALAND_BBOX.south}`;

export const DEFAULT_CENTER: [number, number] = [5.733, 58.97];
export const DEFAULT_ZOOM = 13;
