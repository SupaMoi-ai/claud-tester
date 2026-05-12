"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

export default function AdminDrawer({ open, onClose, onImported }: Props) {
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!open) return null;

  async function upload() {
    if (!file) {
      setStatus("Pick a CSV or JSON file first.");
      return;
    }
    setStatus("Uploading…");
    try {
      const body = await file.text();
      const isJson = file.name.endsWith(".json");
      const resp = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": isJson ? "application/json" : "text/csv",
          "x-admin-token": token,
        },
        body,
      });
      if (!resp.ok) {
        setStatus(`Error ${resp.status}`);
        return;
      }
      const json = (await resp.json()) as { upserted: number };
      setStatus(`Imported ${json.upserted} rows.`);
      onImported();
    } catch {
      setStatus("Upload failed.");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <button
        type="button"
        aria-label="Close admin"
        className="flex-1 bg-ink/40"
        onClick={onClose}
      />
      <aside className="w-[88%] max-w-sm bg-paper border-l border-ink/10 p-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Admin import</h2>
          <button type="button" onClick={onClose} className="text-ink/60 text-sm">
            close
          </button>
        </div>
        <label className="block text-xs text-ink/60 mt-4">Admin token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1 w-full rounded-md border border-ink/15 px-2 py-1.5 text-sm bg-paper outline-none focus:border-ink/40"
        />
        <label className="block text-xs text-ink/60 mt-4">CSV or JSON file</label>
        <input
          type="file"
          accept=".csv,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-xs"
        />
        <button
          type="button"
          onClick={upload}
          className="mt-4 w-full rounded-md bg-ink text-paper py-2 text-sm"
        >
          Import
        </button>
        {status && <p className="mt-3 text-xs text-ink/70">{status}</p>}
        <p className="mt-6 text-[11px] text-ink/50 leading-snug">
          CSV columns: slug, name, parking_type, latitude, longitude, capacity, covered,
          operator, address, source_url, rule_text_original, rule_text_simple,
          price_hourly_nok
        </p>
      </aside>
    </div>
  );
}
