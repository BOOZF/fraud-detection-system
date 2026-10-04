"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAlert, getAlerts, getKpis, getModel } from "@/lib/api";
import { num, pct } from "@/lib/format";
import type { Kpis, ModelInfo } from "@/lib/types";
import { priorityOf } from "../ProbBadge";

const SAMPLE = {
  kpis: { total_txn: 200000, fraud_rate: 0.0123, alerts_open: 87 },
  auc: 0.97,
  alert: { id: null as number | null, prob: 0.93, reasons: ["New device", "Foreign merchant", "Amount 9x 30-day average"] },
};

const GOVERN = [
  { title: "SQL you can audit", body: "Every number carries a Show SQL drawer with the exact statement Teradata ran." },
  { title: "No rows exported", body: "Training, scoring and SOP retrieval run in the engine. Only the prompt reaches the LLM." },
  { title: "Role-based access", body: "Existing Teradata roles and row policies decide who sees which customer." },
  { title: "Sovereign deployment", body: "Teradata Cloud or Factory in Malaysia, with a local LLM option." },
];

interface Live {
  kpis: Kpis | null;
  model: ModelInfo | null;
  alert: { id: number; prob: number; reasons: string[] } | null;
  failed: boolean;
}

export function LandingPreview() {
  const [live, setLive] = useState<Live | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [k, m, a] = await Promise.allSettled([getKpis(), getModel(), getAlerts(0.8, 50)]);
      let alert: Live["alert"] = null;
      if (a.status === "fulfilled" && a.value.length > 0) {
        const top = a.value.reduce((x, y) => (y.prob > x.prob ? y : x));
        try {
          const d = await getAlert(top.txn_id);
          alert = { id: top.txn_id, prob: d.prob, reasons: d.reasons };
        } catch {
          alert = null;
        }
      }
      if (!cancelled)
        setLive({
          kpis: k.status === "fulfilled" ? k.value : null,
          model: m.status === "fulfilled" ? m.value : null,
          alert,
          failed: k.status === "rejected" || m.status === "rejected" || a.status === "rejected" || alert === null,
        });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = live?.kpis ?? null;
  const model = live?.model ?? null;
  const alert = live?.alert ?? null;
  const loading = live === null;
  const usingSample = live?.failed ?? false;
  const shown = alert ?? SAMPLE.alert;

  const stats: [string, string][] = [
    ["Transactions scored", num(kpis?.total_txn ?? SAMPLE.kpis.total_txn)],
    ["Fraud rate", pct(kpis?.fraud_rate ?? SAMPLE.kpis.fraud_rate, 2)],
    ["Open alerts", num(kpis?.alerts_open ?? SAMPLE.kpis.alerts_open)],
    ["Model AUC", (model?.auc ?? SAMPLE.auc).toFixed(3)],
  ];

  const priority = priorityOf(shown.prob);

  return (
    <section id="preview" className="border-b px-6 py-20 sm:px-10">
      <h2 className="sw-display text-[clamp(2.25rem,6vw,5rem)] uppercase">Detect. Explain. Govern.</h2>
      <Tabs defaultValue="detect" className="mt-12">
        <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b bg-transparent p-0 text-(--sw-mute)">
          {(["detect", "explain", "govern"] as const).map((v) => (
            <TabsTrigger
              key={v}
              value={v}
              className="-mb-px rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-lg font-bold capitalize shadow-none data-[state=active]:border-(--sw-fg) data-[state=active]:bg-transparent data-[state=active]:text-(--sw-fg) data-[state=active]:shadow-none"
            >
              {v === "detect" ? "Detect" : v === "explain" ? "Explain" : "Govern"}
            </TabsTrigger>
          ))}
        </TabsList>
        {usingSample && <p className="sw-muted mt-4 text-sm">API unavailable. Sample data shown.</p>}

        <TabsContent value="detect" className="mt-8">
          <dl className="grid grid-cols-2 border-l border-t lg:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="sw-cell border-b border-r p-6">
                <dt className="sw-muted text-xs font-bold uppercase tracking-widest">{k}</dt>
                <dd className={`sw-display mt-6 text-3xl tabular-nums sm:text-4xl ${loading ? "opacity-40" : ""}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="sw-muted mt-6 max-w-2xl text-lg">
            Every transaction gets a fraud probability from XGBoostPredict, so the queue is ordered by risk, not by
            arrival time.
          </p>
        </TabsContent>

        <TabsContent value="explain" className="mt-8 space-y-6">
          <div className="flex flex-wrap items-end gap-6">
            <span className="sw-display text-7xl sm:text-8xl">{Math.round(shown.prob * 100)}%</span>
            <div className="pb-2">
              <p className="text-sm font-bold uppercase tracking-widest">
                {alert ? `Alert #${alert.id}` : "Sample alert"}
              </p>
              {priority && <p className="sw-muted text-sm">Priority {priority.slice(1)} ({priority})</p>}
            </div>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Reason codes">
            {shown.reasons.map((r) => (
              <li key={r} className="border px-3 py-1.5 text-sm font-bold">
                {r}
              </li>
            ))}
          </ul>
          <div className="border p-6">
            <p className="text-xs font-bold uppercase tracking-widest">Copilot, sample answer</p>
            <p className="sw-muted mt-3 max-w-3xl text-lg">
              This is a Priority 1 alert. A first-seen device, a foreign merchant and an unusually large amount match
              the high-risk pattern. Escalate the case for fraud review and record the findings [Fraud_Detection_SOP.pdf p.48].
            </p>
          </div>
        </TabsContent>

        <TabsContent value="govern" className="mt-8">
          <ul className="grid border-l border-t sm:grid-cols-2">
            {GOVERN.map(({ title, body }, i) => (
              <li key={title} className="sw-cell border-b border-r p-6 sm:p-8">
                <span className="sw-display block text-5xl">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-6 text-xl font-bold">{title}</p>
                <p className="sw-muted mt-2">{body}</p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </section>
  );
}
