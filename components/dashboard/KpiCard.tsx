import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { signedPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONES = {
  good: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  bad: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  flat: "bg-muted text-muted-foreground",
} as const;

/** A headline number with its change against the previous period. `upIsGood` says whether a rise is good news. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  change,
  upIsGood,
  periodLabel,
  accent = "bg-primary/10 text-primary",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  change: number | null;
  upIsGood: boolean;
  periodLabel: string;
  accent?: string;
}) {
  const tone = change === null || change === 0 ? "flat" : change > 0 === upIsGood ? "good" : "bad";
  const Arrow = change !== null && change < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      role="group"
      aria-label={label}
      className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("grid size-8 place-items-center rounded-lg", accent)}>
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {change !== null && (
        <p
          data-testid="kpi-delta"
          data-tone={tone}
          className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground"
        >
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums", TONES[tone])}>
            <Arrow aria-hidden className="size-3" />
            {signedPct(change)}
          </span>
          <span>{periodLabel}</span>
        </p>
      )}
    </div>
  );
}
