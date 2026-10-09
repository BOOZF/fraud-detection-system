"use client";

import { Bell, CreditCard, Percent, RefreshCw, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getKpis, getModel, getOverview, rescore } from "@/lib/api";
import { DEMO_USERNAME } from "@/lib/auth";
import { num, pct } from "@/lib/format";
import { periodChange, type Overview } from "@/lib/overview";
import type { Kpis, ModelInfo, ScoreResult } from "@/lib/types";
import { ChannelBars } from "./dashboard/ChannelBars";
import { KpiCard } from "./dashboard/KpiCard";
import { Panel } from "./dashboard/Panel";
import { TopAlerts } from "./dashboard/TopAlerts";
import { TopMerchants } from "./dashboard/TopMerchants";
import { TrendChart } from "./dashboard/TrendChart";
import { SqlPanel } from "./SqlPanel";
import { TdBadge } from "./TdBadge";

const PERIOD_DAYS = 30;
const PERIOD_LABEL = `vs previous ${PERIOD_DAYS} days`;
const NAME = DEMO_USERNAME.charAt(0).toUpperCase() + DEMO_USERNAME.slice(1);

const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

export function DashboardView() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [hello, setHello] = useState("Welcome");

  const load = useCallback(() => {
    getKpis().then(setKpis).catch((e: Error) => setError(e.message));
    getOverview().then(setOverview).catch((e: Error) => setOverviewError(e.message));
  }, []);

  useEffect(() => {
    load();
    getModel().then(setModel).catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock is only known in the browser
    setHello(greeting(new Date().getHours()));
  }, [load]);

  async function onRescore() {
    setScoring(true);
    setError(null);
    try {
      setScore(await rescore());
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScoring(false);
    }
  }

  const changes = useMemo(() => {
    if (!overview) return null;
    const q = (metric: "fraud" | "txn" | "alerts") => periodChange(overview.daily, { metric, days: PERIOD_DAYS });
    const fraud = q("fraud"), txn = q("txn"), alerts = q("alerts");
    const rate = (f: number, t: number) => (t ? f / t : null);
    const [now, before] = [rate(fraud.current, txn.current), rate(fraud.previous, txn.previous)];
    return { fraud: fraud.change, txn: txn.change, alerts: alerts.change, rate: now !== null && before ? (now - before) / before : null };
  }, [overview]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {hello}, {NAME} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is how fraud looks across Malaysia XX Bank, live from Teradata.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {score && <SqlPanel sql={score.sql} />}
          {score && (
            <p role="status" className="text-sm text-muted-foreground">
              Scored <b className="text-foreground">{num(score.rows)} rows</b> in{" "}
              <b className="text-foreground">{score.seconds.toFixed(1)} s</b> <TdBadge />
            </p>
          )}
          <Button type="button" onClick={onRescore} disabled={scoring} className="rounded-full">
            <RefreshCw aria-hidden className={`mr-2 size-4 ${scoring ? "animate-spin" : ""}`} />
            {scoring ? "Scoring in Teradata..." : "Re-score in Teradata"}
          </Button>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          API error: {error}
        </p>
      )}

      {kpis ? (
        <>
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5">
              <KpiCard label="Transactions" value={num(kpis.total_txn)} icon={CreditCard} change={changes?.txn ?? null} upIsGood periodLabel={PERIOD_LABEL} />
              <KpiCard label="Fraud transactions" value={num(kpis.fraud_txn)} icon={ShieldAlert} change={changes?.fraud ?? null} upIsGood={false} periodLabel={PERIOD_LABEL} accent="bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300" />
              <KpiCard label="Fraud rate" value={pct(kpis.fraud_rate, 2)} icon={Percent} change={changes?.rate ?? null} upIsGood={false} periodLabel={PERIOD_LABEL} accent="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300" />
              <KpiCard label="Open alerts" value={num(kpis.alerts_open)} icon={Bell} change={changes?.alerts ?? null} upIsGood={false} periodLabel={PERIOD_LABEL} accent="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300" />
            </div>
            <div className="lg:col-span-4">
              <TopAlerts />
            </div>
            <div className="lg:col-span-3">
              {overview ? (
                <TopMerchants rows={overview.merchants} />
              ) : (
                <Panel title="Top merchants" description="Categories with the most fraud.">
                  <p className="text-sm text-muted-foreground">{overviewError ? "Merchant data is unavailable." : "Loading..."}</p>
                </Panel>
              )}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <Panel
              className="lg:col-span-5"
              title="Fraud by channel"
              description="Where to focus analyst capacity first. Click a channel to focus the trend."
              actions={
                <>
                  <TdBadge />
                  <SqlPanel sql={kpis.sql} />
                </>
              }
            >
              <ChannelBars data={kpis.fraud_by_channel} selected={channel} onSelect={setChannel} />
            </Panel>
            <Panel
              className="lg:col-span-7"
              title="Trend"
              description="Daily activity from the scored transactions."
              actions={overview ? <><TdBadge /><SqlPanel sql={overview.sql} /></> : undefined}
            >
              {overview ? (
                <TrendChart rows={overview.daily} channel={channel} onClearChannel={() => setChannel(null)} />
              ) : (
                <p className="grid h-60 place-items-center text-sm text-muted-foreground">
                  {overviewError ? `Trend data is unavailable: ${overviewError}` : "Loading trend..."}
                </p>
              )}
            </Panel>
          </div>
        </>
      ) : (
        !error && <p className="text-sm text-muted-foreground">Loading KPIs...</p>
      )}

      {model && (
        <Panel title="Model card" description="Trained with Teradata XGBoost, no data egress." actions={<TdBadge />}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Algorithm", model.algorithm],
              ["AUC", model.auc.toFixed(3)],
              ["Gini", model.gini.toFixed(3)],
              ["Train rows", num(model.train_rows)],
              ["Test rows", num(model.test_rows)],
              ["Train time", `${model.train_seconds.toFixed(1)} s`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-muted/50 p-3">
                <dt className="text-xs font-medium uppercase text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm">
            <b>Features:</b> <span className="text-muted-foreground">{model.features.join(", ")}</span>
          </p>
        </Panel>
      )}
    </div>
  );
}
