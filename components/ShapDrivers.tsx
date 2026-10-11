import type { ShapDriver } from "@/lib/types";
import { cn } from "@/lib/utils";

const EFFECT = { up: "raises the risk", down: "lowers the risk" } as const;
const CHIP = { strongly: "Strong", moderately: "Medium", slightly: "Slight" } as const;

/**
 * The model's own explanation of one score: the features that moved it most. Each row has the feature and its value, a bar
 * growing right (toward fraud) or left (away from it) on one shared scale, and a chip saying how strongly. The scale is
 * only comparable within this transaction; the raw SHAP value (log-odds) is in the tooltip.
 */
export function ShapDrivers({ drivers }: { drivers: ShapDriver[] }) {
  const maxUp = Math.max(0, ...drivers.map((d) => d.shap));
  const maxDown = Math.max(0, ...drivers.map((d) => -d.shap));
  const total = Math.max(1e-9, maxUp + maxDown);
  const zero = (maxDown / total) * 100; // where "no effect" sits; 0 when nothing lowers the risk, so no track is wasted

  return (
    <ul className="divide-y divide-border/60" aria-label="Top SHAP drivers">
      {drivers.map((d) => {
        const up = d.direction === "up";
        const size = (Math.abs(d.shap) / total) * 100;
        return (
          <li
            key={d.feature}
            title={`SHAP ${d.shap > 0 ? "+" : ""}${d.shap.toFixed(3)} (log-odds)`}
            className="grid grid-cols-[minmax(0,9.5rem)_1fr_4.5rem] items-center gap-3 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,13rem)_1fr_5rem]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{d.label}</p>
              <p className="truncate text-xs text-muted-foreground">{d.value}</p>
            </div>
            <div className="relative h-3 rounded-full bg-muted/70" aria-hidden>
              {maxDown > 0 && <div className="absolute inset-y-[-3px] w-px bg-border" style={{ left: `${zero}%` }} />}
              <div
                className={cn("absolute inset-y-0 rounded-full", up ? "bg-rose-500/85" : "bg-sky-500/85")}
                style={{ left: `${up ? zero : zero - size}%`, width: `${size}%` }}
              />
            </div>
            <span
              aria-hidden
              className={cn(
                "justify-self-end rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                up ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
              )}
            >
              {up ? "↑" : "↓"} {CHIP[d.strength]}
            </span>
            <span className="sr-only">
              {d.strength} {EFFECT[d.direction]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
