"use client";

import { useEffect, useRef, useState } from "react";

type Pick = { lat: number; lng: number; label: string };

type Result = {
  displayName: string;
  latitude: number;
  longitude: number;
};

export default function DestinationSearch({ onPick }: { onPick: (p: Pick) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<number | null>(null);

  useEffect(() => {
    if (debounce.current) window.clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = window.setTimeout(async () => {
      try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = (await resp.json()) as { results: Result[] };
        setResults(json.results);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [q]);

  return (
    <div className="relative">
      <input
        type="search"
        inputMode="search"
        value={q}
        placeholder="Where are you going?"
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-full bg-paper/95 border border-ink/10 px-4 py-2 text-sm outline-none focus:border-ink/40 placeholder:text-ink/50"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 rounded-xl bg-paper border border-ink/10 max-h-72 overflow-y-auto z-40">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="block w-full text-left px-3 py-2 text-sm hover:bg-ink/5"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick({
                    lat: r.latitude,
                    lng: r.longitude,
                    label: r.displayName,
                  });
                  setQ(r.displayName.split(",")[0] ?? r.displayName);
                  setOpen(false);
                }}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
