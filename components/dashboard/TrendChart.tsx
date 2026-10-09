"use client";

import { BarChart3, LineChart, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { num, signedPct } from "@/lib/format";
import { periodChange, seriesFor, type DailyRow, type Metric } from "@/lib/overview";
import { cn } from "@/lib/utils";

const METRICS: { key: Metric; button: string; title: string; noun: string }[] = [
  { key: "fraud", button: "Fraud", title: "Fraud", noun: "fraud" },
  { key: "alerts", button: "Alerts", title: "Alerts", noun: "alerts" },
  { key: "txn", button: "Transactions", title: "Transactions", noun: "transactions" },
];
const RANGES = [7, 30, 90];

const W = 640, H = 260, PAD = { l: 44, r: 12, t: 12, b: 28 };
const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;

const longDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** A round upper bound for the y axis, so the grid lines land on tidy numbers. */
function niceMax(v: number) {
  if (v <= 0) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].map((m) => m * mag).find((c) => c >= v) ?? v) as number;
}

/** Smooth curve through the points (Catmull-Rom converted to cubic Beziers). */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function TrendChart({
  rows,
  channel,
  onClearChannel,
}: {
  rows: DailyRow[];
  channel: string | null;
  onClearChannel?: () => void;
}) {
  const [metric, setMetric] = useState<Metric>("fraud");
  const [days, setDays] = useState(30);
  const [kind, setKind] = useState<"line" | "bar">("line");
  const [hover, setHover] = useState<number | null>(null);
  const gradient = useId();

  const meta = METRICS.find((m) => m.key === metric)!;
  const series = useMemo(() => seriesFor(rows, { metric, days, channel }), [rows, metric, days, channel]);
  const change = useMemo(() => periodChange(rows, { metric, days, channel }), [rows, metric, days, channel]);

  const total = series.reduce((a, p) => a + p.value, 0);
  const top = niceMax(Math.max(0, ...series.map((p) => p.value)));
  const step = series.length > 1 ? plotW / (series.length - 1) : plotW;
  const x = (i: number) => PAD.l + (series.length > 1 ? i * step : plotW / 2);
  const y = (v: number) => PAD.t + plotH - (v / top) * plotH;
  const pts = series.map((p, i) => [x(i), y(p.value)] as [number, number]);
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const labelEvery = Math.max(1, Math.round(series.length / 6));
  const barW = Math.max(2, (plotW / Math.max(1, series.length)) * 0.62);

  const hovered = hover !== null ? series[hover] : null;
  const prev = hover !== null && hover > 0 ? series[hover - 1] : null;
  const dayChange = hovered && prev && prev.value > 0 ? (hovered.value - prev.value) / prev.value : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{meta.title} over time</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Daily, {channel ? "" : "all channels"}
            {channel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {channel}
                {onClearChannel && (
                  <button type="button" aria-label="Show all channels" onClick={onClearChannel} className="rounded-full hover:bg-primary/20">
                    <X aria-hidden className="size-3" />
                  </button>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Time range"
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setHover(null);
            }}
            className="h-8 rounded-full border bg-card px-3 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>{`Last ${r} days`}</option>
            ))}
          </select>
          <div className="inline-flex rounded-full bg-muted p-0.5">
            {([["line", "Line chart", LineChart], ["bar", "Bar chart", BarChart3]] as const).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                aria-label={label}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn("grid size-7 place-items-center rounded-full transition-colors", kind === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon aria-hidden className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div role="group" aria-label="Metric" className="inline-flex rounded-full bg-muted p-0.5 text-xs font-medium">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={cn("rounded-full px-3 py-1 transition-colors", metric === m.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {m.button}
            </button>
          ))}
        </div>
        <p className="flex items-baseline gap-2">
          <span data-testid="trend-total" className="text-2xl font-semibold tabular-nums">{num(total)}</span>
          <span className="text-xs text-muted-foreground">{meta.noun} in {days} days</span>
          {change.change !== null && (
            <span className="text-xs tabular-nums text-muted-foreground">
              <b className={cn("font-semibold", (change.change > 0) === (metric === "txn") ? "text-emerald-600" : "text-rose-600")}>
                {signedPct(change.change)}
              </b>{" "}
              vs previous {days} days
            </span>
          )}
        </p>
      </div>

      {series.length === 0 ? (
        <p className="grid h-60 place-items-center text-sm text-muted-foreground">No data to chart.</p>
      ) : (
        <div className="relative mt-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="group" aria-label={`${meta.title} per day`}>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                  {t >= 1000 ? `${+(t / 1000).toFixed(1)}K` : +t.toFixed(1)}
                </text>
              </g>
            ))}
            {series.map((p, i) =>
              i % labelEvery === 0 || i === series.length - 1 ? (
                <text key={p.date} x={x(i)} y={H - 8} textAnchor={i === series.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">
                  {shortDate(p.date)}
                </text>
              ) : null,
            )}

            {kind === "line" ? (
              <>
                <path d={`${smooth(pts)} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${gradient})`} />
                <path data-series d={smooth(pts)} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              series.map((p, i) => (
                <rect
                  key={p.date}
                  data-bar
                  x={x(i) - barW / 2}
                  y={y(p.value)}
                  width={barW}
                  height={Math.max(0, y(0) - y(p.value))}
                  rx={Math.min(4, barW / 2)}
                  fill="var(--primary)"
                  opacity={hover === null || hover === i ? 1 : 0.35}
                />
              ))
            )}

            {hover !== null && hovered && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={y(0)} stroke="var(--primary)" strokeOpacity="0.35" strokeDasharray="3 3" />
                {kind === "line" && <circle cx={x(hover)} cy={y(hovered.value)} r="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="2.5" />}
              </g>
            )}

            {series.map((p, i) => (
              <rect
                key={`hit-${p.date}`}
                aria-label={`${p.date}: ${p.value}`}
                tabIndex={0}
                x={x(i) - (series.length > 1 ? step / 2 : plotW / 2)}
                y={PAD.t}
                width={series.length > 1 ? step : plotW}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair outline-none"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            ))}
          </svg>

          {hovered && hover !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg"
              style={{ left: `${(x(hover) / W) * 100}%`, top: `${(Math.max(PAD.t, y(hovered.value) - 62) / H) * 100}%` }}
            >
              <p className="font-medium">{longDate(hovered.date)}</p>
              <p className="mt-1 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{meta.title}</span>
                <span className="font-semibold tabular-nums">{num(hovered.value)}</span>
              </p>
              {dayChange !== null && (
                <p className="mt-0.5 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">vs previous day</span>
                  <span className={cn("font-semibold tabular-nums", (dayChange > 0) === (metric === "txn") ? "text-emerald-600" : "text-rose-600")}>
                    {signedPct(dayChange, 0)}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
