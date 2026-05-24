"use client";

import { useEffect, useState } from "react";
import {
  clearAllPieces,
  createPiece,
  listPieces,
} from "@/lib/db/pieces";
import { sampleVersaceSS92 } from "@/lib/db/sample";
import { palette } from "@/lib/design/tokens";
import type { Piece } from "@/lib/types/piece";

export default function Home() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listPieces()
      .then(setPieces)
      .finally(() => setReady(true));
  }, []);

  async function handleInsert() {
    await createPiece(sampleVersaceSS92());
    setPieces(await listPieces());
  }

  async function handleClear() {
    await clearAllPieces();
    setPieces([]);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-16">
      <header className="mb-14 border-b border-ink/20 pb-10">
        <p className="font-label mb-3 text-xs uppercase tracking-[0.22em] text-ochre">
          Phase 1 · Piece OS · Sprint 1
        </p>
        <h1 className="font-display text-7xl leading-none text-ink">FARÉ</h1>
        <p className="font-body mt-4 text-lg italic text-ink/80">
          The vintage operator&apos;s brain. Past, present, future — one piece
          at a time.
        </p>
      </header>

      <Section label="Palette">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {Object.entries(palette).map(([name, hex]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div
                className="aspect-square rounded-sm border border-ink/10"
                style={{ background: hex }}
              />
              <span className="font-label text-[10px] uppercase tracking-[0.18em] text-ink/70">
                {name}
              </span>
              <span className="font-body text-xs text-ink/50">{hex}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Typography">
        <div className="space-y-6">
          <Specimen
            role="Cormorant Garamond — display"
            className="font-display text-4xl text-ink"
          >
            SS92 Miami silk shirt
          </Specimen>
          <Specimen
            role="EB Garamond — body"
            className="font-body text-base leading-relaxed text-ink/90"
          >
            An archive is only as good as the hands that handle it. FARÉ records
            what <em>was</em>, what <em>is</em>, and what&apos;s becoming — one
            piece at a time.
          </Specimen>
          <Specimen
            role="Barlow Condensed — label"
            className="font-label text-sm uppercase tracking-[0.22em] text-ink"
          >
            Verified · Deadstock · Listed
          </Specimen>
        </div>
      </Section>

      <Section label="Persistence smoke test">
        <p className="font-body mb-5 text-sm italic text-ink/60">
          Insert a hardcoded Versace SS92 silk shirt. Round-trips through
          IndexedDB. Reload to confirm persistence.
        </p>
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleInsert}
            className="font-label bg-ink px-5 py-3 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-cognac"
          >
            Insert sample piece
          </button>
          {pieces.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="font-label border border-ink/30 px-5 py-3 text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:border-ink"
            >
              Clear ({pieces.length})
            </button>
          )}
        </div>

        {!ready ? (
          <p className="font-body italic text-ink/40">Loading…</p>
        ) : pieces.length === 0 ? (
          <p className="font-body italic text-ink/50">
            No pieces yet. Click above to insert the sample.
          </p>
        ) : (
          <ul className="space-y-7">
            {pieces.map((p) => (
              <PieceCard key={p.id} piece={p} />
            ))}
          </ul>
        )}
      </Section>

      <footer className="mt-16 border-t border-ink/20 pt-6">
        <p className="font-body text-xs italic text-ink/50">
          Sprint 1 scaffold · IndexedDB persistence · no backend yet
        </p>
      </footer>
    </main>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-center gap-4">
        <p className="font-label text-xs uppercase tracking-[0.22em] text-ochre">
          {label}
        </p>
        <span className="h-px flex-1 bg-ochre/30" />
      </div>
      {children}
    </section>
  );
}

function Specimen({
  role,
  children,
  className,
}: {
  role: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div>
      <p className="font-label mb-1.5 text-[10px] uppercase tracking-[0.18em] text-ink/50">
        {role}
      </p>
      <p className={className}>{children}</p>
    </div>
  );
}

function PieceCard({ piece }: { piece: Piece }) {
  return (
    <li className="border-l-2 border-ochre pl-5">
      <p className="font-label mb-1 text-[10px] uppercase tracking-[0.2em] text-ochre">
        {piece.era_decade}
        {piece.era_collection ? ` · ${piece.era_collection}` : ""}
      </p>
      <p className="font-display mb-1 text-2xl text-ink">
        {piece.brand}
        {piece.garment_type ? (
          <span className="italic text-ink/70"> {piece.garment_type}</span>
        ) : null}
      </p>
      <p className="font-body text-sm leading-relaxed text-ink/70">
        Size {piece.size_label} · {piece.condition_grade} ·{" "}
        <span className="text-sage">{piece.auth_state}</span> · cost{" "}
        {piece.cost_nok.toLocaleString("nb-NO")} NOK · target{" "}
        <span className="text-gold">
          {piece.valuation_target_nok.toLocaleString("nb-NO")} NOK
        </span>
      </p>
      <p className="font-body mt-1.5 text-xs italic text-ink/45">
        {piece.valuation_explanation}
      </p>
    </li>
  );
}
