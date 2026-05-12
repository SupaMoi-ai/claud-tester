"use client";

import { useEffect, useState } from "react";
import type { ParkingListItem, LocalTipDTO } from "@/lib/types";
import RuleExplainer from "./RuleExplainer";
import LocalTipsInline from "./LocalTipsInline";
import { walkingMinutes } from "@/lib/geo";
import { ZONE_COLORS, ZONE_LABEL } from "@/lib/zone-status";
import FreeUntilCountdown from "./FreeUntilCountdown";

type Props = {
  item: ParkingListItem;
  onBack: () => void;
  onReport: (locationId: string, occupancyPercent: number) => void;
};

export default function ParkingDetail({ item, onBack, onReport }: Props) {
  const [tips, setTips] = useState<LocalTipDTO[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/parking/${item.id}`);
        if (!resp.ok) return;
        const json = (await resp.json()) as { tips: LocalTipDTO[] };
        if (!cancelled) setTips(json.tips);
      } catch {
        // detail enrichment is optional offline
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  return (
    <div className="px-3 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-ink/60 mb-2 underline-offset-2 hover:underline"
      >
        ← Back to list
      </button>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-1 h-3 w-3 rounded-full"
          style={{ background: ZONE_COLORS[item.zoneStatus] }}
        />
        <div>
          <h2 className="text-base font-medium">{item.name}</h2>
          <p className="text-xs text-ink/60">
            {item.parkingType.toLowerCase()} ·{" "}
            <span style={{ color: ZONE_COLORS[item.zoneStatus] }}>
              {ZONE_LABEL[item.zoneStatus]}
            </span>
            {item.walkingMeters != null && (
              <> · {walkingMinutes(item.walkingMeters)} min walk</>
            )}
          </p>
          <div className="mt-1 text-sm">
            <FreeUntilCountdown item={item} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ink/50">
        Always check signs on site. Parking rules may change.
      </p>

      {item.rules.length > 0 && (
        <section className="mt-4 space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-ink/50">Rules</h3>
          {item.rules.map((r) => (
            <RuleExplainer key={r.id} rule={r} />
          ))}
        </section>
      )}

      {item.prices.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs uppercase tracking-wide text-ink/50 mb-2">Prices</h3>
          <ul className="space-y-1 text-sm">
            {item.prices.map((p) => (
              <li
                key={p.id}
                className="flex items-baseline justify-between border-b border-ink/5 py-1"
              >
                <span>{p.priceType.toLowerCase()}</span>
                <span className="text-ink/80">
                  {p.priceType === "FREE" ? "—" : `${p.amountNok} NOK`}
                  {p.startsAt && p.endsAt && (
                    <span className="text-ink/40">
                      {" "}
                      ({p.startsAt}–{p.endsAt})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 text-xs text-ink/60">
        <div>
          {item.capacity != null && <span>{item.capacity} spaces</span>}
          {item.capacityDisabled != null && (
            <span> · {item.capacityDisabled} disabled</span>
          )}
          {item.capacityCharging != null && (
            <span> · {item.capacityCharging} EV chargers</span>
          )}
          {item.covered && <span> · covered</span>}
        </div>
        {item.operator && <div>Operator: {item.operator}</div>}
        {item.lastVerifiedAt && (
          <div>Verified {new Date(item.lastVerifiedAt).toLocaleDateString()}</div>
        )}
        {item.sourceUrl && (
          <a
            className="underline underline-offset-2"
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
        )}
      </section>

      <LocalTipsInline tips={tips} />

      <section className="mt-5">
        <h3 className="text-xs uppercase tracking-wide text-ink/50 mb-2">
          Report what you see
        </h3>
        <div className="flex flex-wrap gap-2">
          {[10, 50, 90, 100].map((occ) => (
            <button
              key={occ}
              type="button"
              onClick={() => onReport(item.id, occ)}
              className="rounded-full border border-ink/15 px-3 py-1.5 text-xs hover:bg-ink/5"
            >
              {occ === 10
                ? "Plenty open"
                : occ === 50
                  ? "Half full"
                  : occ === 90
                    ? "Almost full"
                    : "Full"}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
