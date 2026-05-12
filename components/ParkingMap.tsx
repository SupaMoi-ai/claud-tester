"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MLMap, type GeoJSONSource } from "maplibre-gl";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  ROGALAND_MAX_BOUNDS,
} from "@/lib/rogaland-bounds";
import { ZONE_COLORS } from "@/lib/zone-status";
import type { ParkingListItem, ZoneStatus } from "@/lib/types";

type Props = {
  items: ParkingListItem[];
  origin: { lat: number; lng: number; label: string } | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const PARKING_SRC = "parking-src";
const PARKING_LAYER = "parking-layer";
const PARKING_OUTLINE_LAYER = "parking-outline-layer";
const MASK_SRC = "rogaland-mask-src";
const MASK_LAYER = "rogaland-mask-layer";
const ORIGIN_SRC = "origin-src";
const ORIGIN_LAYER = "origin-layer";

function itemsToFeatures(items: ParkingListItem[], selectedId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: items.map((it) => ({
      type: "Feature" as const,
      properties: {
        id: it.id,
        name: it.name,
        status: it.zoneStatus,
        selected: it.id === selectedId ? 1 : 0,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [it.longitude, it.latitude],
      },
    })),
  };
}

function zoneColorExpression() {
  return [
    "match",
    ["get", "status"],
    "free",
    ZONE_COLORS.free,
    "limited",
    ZONE_COLORS.limited,
    "restricted",
    ZONE_COLORS.restricted,
    "#888",
  ] as unknown as maplibregl.ExpressionSpecification;
}

export default function ParkingMap({ items, origin, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const tickRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
            maxzoom: 19,
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 8,
      maxZoom: 18,
      maxBounds: ROGALAND_MAX_BOUNDS,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", async () => {
      try {
        const resp = await fetch("/data/rogaland.geojson");
        const geo = await resp.json();
        const worldRing: [number, number][] = [
          [-180, -85],
          [180, -85],
          [180, 85],
          [-180, 85],
          [-180, -85],
        ];
        const rogalandRings: [number, number][][] = (() => {
          const f = geo.features?.[0] ?? geo;
          const g = f.geometry ?? f;
          if (g.type === "Polygon") return g.coordinates as [number, number][][];
          if (g.type === "MultiPolygon") {
            return (g.coordinates as [number, number][][][]).flatMap((p) => p);
          }
          return [];
        })();
        const mask = {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "Polygon" as const,
            coordinates: [worldRing, ...rogalandRings],
          },
        };
        map.addSource(MASK_SRC, { type: "geojson", data: mask });
        map.addLayer({
          id: MASK_LAYER,
          type: "fill",
          source: MASK_SRC,
          paint: {
            "fill-color": "#1C1B17",
            "fill-opacity": 0.6,
          },
        });
      } catch {
        // mask is decorative; failing is acceptable
      }

      map.addSource(PARKING_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: PARKING_LAYER,
        type: "circle",
        source: PARKING_SRC,
        paint: {
          "circle-color": zoneColorExpression(),
          "circle-radius": [
            "case",
            ["==", ["get", "selected"], 1],
            14,
            10,
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": [
            "case",
            ["==", ["get", "selected"], 1],
            3,
            1.5,
          ],
          "circle-stroke-color": "#F7F4EC",
        },
      });

      map.addLayer({
        id: PARKING_OUTLINE_LAYER,
        type: "circle",
        source: PARKING_SRC,
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-radius": 22,
          "circle-stroke-width": 0,
        },
      });

      map.on("click", PARKING_LAYER, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = (f.properties as { id?: string } | null)?.id;
        if (id) onSelectRef.current(id);
      });
      map.on("mouseenter", PARKING_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", PARKING_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });

      map.addSource(ORIGIN_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: ORIGIN_LAYER,
        type: "circle",
        source: ORIGIN_SRC,
        paint: {
          "circle-color": "#1C1B17",
          "circle-radius": 6,
          "circle-stroke-color": "#F7F4EC",
          "circle-stroke-width": 2,
        },
      });

      mapRef.current = map;
      pushItems();
      pushOrigin();
      tickRef.current = window.setInterval(pushItems, 60_000);
    });

    return () => {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushItems() {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(PARKING_SRC) as GeoJSONSource | undefined;
    if (!src) return;
    const recomputed = items.map((it) => recomputeStatus(it));
    src.setData(itemsToFeatures(recomputed, selectedId));
  }

  function pushOrigin() {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(ORIGIN_SRC) as GeoJSONSource | undefined;
    if (!src) return;
    if (!origin) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    src.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { label: origin.label },
          geometry: { type: "Point", coordinates: [origin.lng, origin.lat] },
        },
      ],
    });
    map.flyTo({ center: [origin.lng, origin.lat], zoom: 14, speed: 1.2 });
  }

  useEffect(() => {
    pushItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedId]);

  useEffect(() => {
    pushOrigin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function recomputeStatus(it: ParkingListItem): ParkingListItem {
  const now = new Date();
  let status: ZoneStatus = it.zoneStatus;
  if (it.freeUntil) {
    const free = new Date(it.freeUntil);
    const minutesLeft = (free.getTime() - now.getTime()) / 60_000;
    if (minutesLeft <= 0) {
      status = "limited";
    } else if (minutesLeft < 30 && status === "free") {
      status = "limited";
    }
  }
  if (it.paidUntil) {
    const paid = new Date(it.paidUntil);
    if (paid.getTime() <= now.getTime() && status === "limited") {
      status = "free";
    }
  }
  return { ...it, zoneStatus: status };
}
