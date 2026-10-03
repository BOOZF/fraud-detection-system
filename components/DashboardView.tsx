"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getKpis, getModel, rescore } from "@/lib/api";
import { num, pct } from "@/lib/format";
import type { Kpis, ModelInfo, ScoreResult } from "@/lib/types";
import { SqlPanel } from "./SqlPanel";
import { TdBadge } from "./TdBadge";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <TdBadge />
      </CardContent>
    </Card>
  );
}

function ChannelChart({ data }: { data: Kpis["fraud_by_channel"] }) {
  const max = Math.max(1, ...data.map((d) => d.fraud));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.channel}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{d.channel}</span>
            <span className="tabular-nums text-muted-foreground">
              {num(d.fraud)} fraud / {num(d.txn)} txn
            </span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${(d.fraud / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DashboardView() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getKpis().then(setKpis).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    getModel().then(setModel).catch((e: Error) => setError(e.message));
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

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          API error: {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onRescore} disabled={scoring}>
          {scoring ? "Scoring in Teradata..." : "Re-score in Teradata"}
        </Button>
        {score && <SqlPanel sql={score.sql} />}
        {score && (
          <p role="status" className="text-sm text-muted-foreground">
            Scored <b className="text-foreground">{num(score.rows)} rows</b> in{" "}
            <b className="text-foreground">{score.seconds.toFixed(1)} s</b> <TdBadge />
          </p>
        )}
      </div>

      {kpis ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Transactions" value={num(kpis.total_txn)} />
            <Kpi label="Fraud transactions" value={num(kpis.fraud_txn)} />
            <Kpi label="Fraud rate" value={pct(kpis.fraud_rate, 2)} />
            <Kpi label="Open alerts" value={num(kpis.alerts_open)} />
          </div>
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Fraud by channel</CardTitle>
                <CardDescription>Where to focus analyst capacity first.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <TdBadge />
                <SqlPanel sql={kpis.sql} />
              </div>
            </CardHeader>
            <CardContent>
              <ChannelChart data={kpis.fraud_by_channel} />
            </CardContent>
          </Card>
        </>
      ) : (
        !error && <p className="text-sm text-muted-foreground">Loading KPIs...</p>
      )}

      {model && (
        <Card>
          <CardHeader>
            <CardTitle>Model card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Algorithm", model.algorithm],
                ["AUC", model.auc.toFixed(3)],
                ["Gini", model.gini.toFixed(3)],
                ["Train rows", num(model.train_rows)],
                ["Test rows", num(model.test_rows)],
                ["Train time", `${model.train_seconds.toFixed(1)} s`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">{k}</dt>
                  <dd className="text-xl font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm">
              <b>Features:</b> <span className="text-muted-foreground">{model.features.join(", ")}</span>
            </p>
            <div className="flex items-center gap-2">
              <TdBadge />
              <span className="text-xs text-muted-foreground">trained with Teradata XGBoost, no data egress</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
