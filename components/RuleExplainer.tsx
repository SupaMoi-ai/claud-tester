"use client";

import type { RuleDTO } from "@/lib/types";

function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDays(dow: number[]): string {
  if (dow.length === 7) return "Every day";
  if (dow.length === 5 && [1, 2, 3, 4, 5].every((d) => dow.includes(d))) return "Mon–Fri";
  if (dow.length === 2 && dow.includes(0) && dow.includes(6)) return "Weekends";
  return dow.map((d) => DAYS[d]).join(", ");
}

export default function RuleExplainer({ rule }: { rule: RuleDTO }) {
  return (
    <div className="rounded-xl border border-ink/10 p-3">
      <p className="text-sm">{rule.ruleTextSimple}</p>
      {rule.freeWindow && (
        <p className="mt-1 text-xs text-ink/60">
          Free: {formatDays(rule.freeWindow.daysOfWeek)} ·{" "}
          {formatTime(rule.freeWindow.startMinute)}–{formatTime(rule.freeWindow.endMinute)}
        </p>
      )}
      {rule.enforcementWindow && (
        <p className="text-xs text-ink/60">
          Paid: {formatDays(rule.enforcementWindow.daysOfWeek)} ·{" "}
          {formatTime(rule.enforcementWindow.startMinute)}–
          {formatTime(rule.enforcementWindow.endMinute)}
        </p>
      )}
      {rule.maxStayMinutes != null && (
        <p className="text-xs text-ink/60">Max stay: {rule.maxStayMinutes} min</p>
      )}
      {rule.permitRequired && <p className="text-xs text-ink/60">Permit required</p>}
      <details className="mt-2 text-xs text-ink/60">
        <summary className="cursor-pointer">Original sign text</summary>
        <p className="mt-1 whitespace-pre-line">{rule.ruleTextOriginal}</p>
      </details>
      {rule.sourceUrl && (
        <a
          href={rule.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs underline underline-offset-2 text-ink/70"
        >
          Source
        </a>
      )}
    </div>
  );
}
