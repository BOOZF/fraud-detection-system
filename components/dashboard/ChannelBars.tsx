"use client";

import { useState } from "react";
import { num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = { channel: string; txn: number; fraud: number };
type Mode = "count" | "rate";

/** Fraud by channel as horizontal bars. Click a channel to focus the rest of the dashboard on it (click again to clear). */
export function ChannelBars({
  data,
  selected,
  onSelect,
}: {
  data: Row[];
  selected: string | null;
  onSelect: (channel: string | null) => void;
}) {
  const [mode, setMode] = useState<Mode>("count");
  const value = (r: Row) => (mode === "count" ? r.fraud : r.txn ? r.fraud / r.txn : 0);
  const rows = [...data].sort((a, b) => value(b) - value(a));
  const max = Math.max(1e-9, ...rows.map(value));
  const totalFraud = data.reduce((a, r) => a + r.fraud, 0);
  const chosen = rows.find((r) => r.channel === selected);

  return (
    <div>
      <div role="group" aria-label="Bar metric" className="mb-4 inline-flex rounded-full bg-muted p-0.5 text-xs font-medium">
        {([["count", "Fraud count"], ["rate", "Fraud rate"]] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const width = (value(r) / max) * 100;
          const active = r.channel === selected;
          return (
            <li
              key={r.channel}
              className={cn(
                "group relative rounded-xl px-3 py-2 transition-colors hover:bg-muted/60",
                active && "bg-primary/5 ring-1 ring-primary/30",
                selected && !active && "opacity-60",
              )}
            >
              <button
                type="button"
                aria-pressed={active}
                aria-label={`${r.channel}: ${num(r.fraud)} fraud / ${num(r.txn)} txn`}
                onClick={() => onSelect(active ? null : r.channel)}
                className="flex w-full items-baseline justify-between gap-3 text-left text-sm after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                <span className="font-medium">{r.channel}</span>
                <span className="tabular-nums text-muted-foreground">
                  {mode === "count" ? <>{`${num(r.fraud)} fraud / ${num(r.txn)} txn`}</> : <span>{pct(value(r), 2)}</span>}
                </span>
              </button>
              <div
                role="progressbar"
                aria-label={`${r.channel} bar`}
                aria-valuenow={Math.round(width)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn("h-full rounded-full bg-primary transition-[width] duration-500", active && "bg-primary")}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {chosen && (
        <p role="status" className="mt-3 rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <b className="text-foreground">{chosen.channel}</b>: {pct(chosen.txn ? chosen.fraud / chosen.txn : 0, 2)} of its
          transactions are fraud and it holds {pct(totalFraud ? chosen.fraud / totalFraud : 0, 0)} of all fraud. The trend
          chart now shows this channel only.
        </p>
      )}
    </div>
  );
}
