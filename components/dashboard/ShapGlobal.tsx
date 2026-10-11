"use client";

import { useEffect, useState } from "react";
import { SqlPanel } from "@/components/SqlPanel";
import { TdBadge } from "@/components/TdBadge";
import { getShapGlobal } from "@/lib/api";
import { num } from "@/lib/format";
import type { ShapGlobal as ShapGlobalData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

const TOP = 8;
const STRONGEST = 3;

/** Which features drive the model's fraud scores overall: mean |SHAP| over a uniform sample, computed in Teradata. */
export function ShapGlobal({ className }: { className?: string }) {
  const [data, setData] = useState<ShapGlobalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    getShapGlobal().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  const features = data?.features ?? [];
  const rows = all ? features : features.slice(0, TOP);
  const max = Math.max(1e-9, ...features.map((r) => r.mean_abs_shap));
  return (
    <Panel
      className={className}
      title="What drives fraud scores"
      description={
        data
          ? `Average push each feature gives a score, in either direction (SHAP). Sample of ${num(data.sample_size)} transactions.`
          : "Average push each feature gives a score (SHAP)."
      }
      actions={
        data ? (
          <>
            <TdBadge />
            <SqlPanel sql={data.sql} />
          </>
        ) : undefined
      }
    >
      {data ? (
        <>
          <ol className="space-y-2.5">
            {rows.map((r, i) => (
              <li key={r.feature} className="grid grid-cols-[minmax(0,13rem)_1fr_2.5rem] items-center gap-3 text-sm">
                <span className={cn("truncate", i < STRONGEST ? "font-medium" : "text-muted-foreground")}>{r.label}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted/70" aria-hidden>
                  <div
                    className={cn("h-full rounded-full", i < STRONGEST ? "bg-primary" : "bg-primary/45")}
                    style={{ width: `${(r.mean_abs_shap / max) * 100}%` }}
                  />
                </div>
                <span className="text-right tabular-nums text-muted-foreground">{r.mean_abs_shap.toFixed(2)}</span>
              </li>
            ))}
          </ol>
          {features.length > TOP && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mt-4 text-xs font-medium text-primary hover:underline"
            >
              {all ? "Show top 8" : `Show all ${features.length} features`}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{error ? "SHAP data is unavailable." : "Loading..."}</p>
      )}
    </Panel>
  );
}
