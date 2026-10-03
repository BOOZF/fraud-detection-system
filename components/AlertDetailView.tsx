"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAlert } from "@/lib/api";
import { myr } from "@/lib/format";
import type { AlertDetail } from "@/lib/types";
import { CopilotChat } from "./CopilotChat";
import { priorityOf, ProbBadge } from "./ProbBadge";
import { SqlPanel } from "./SqlPanel";
import { TdBadge } from "./TdBadge";

const SLA = { P1: "Priority 1: act within 15 minutes (SOP 4.1)", P2: "Priority 2: act within 2 hours (SOP 4.1)" };

export function AlertDetailView({ id }: { id: number }) {
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAlert(id).then(setDetail).catch((e: Error) => setError(e.message));
  }, [id]);

  const back = (
    <Link href="/dashboard#alerts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft aria-hidden className="size-4" /> Alert queue
    </Link>
  );

  if (error)
    return (
      <div className="space-y-4">
        {back}
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Could not load alert: {error}
        </p>
      </div>
    );
  if (!detail)
    return (
      <div className="space-y-4">
        {back}
        <p className="text-muted-foreground">Loading alert...</p>
      </div>
    );

  const { txn, prob, reasons, sql } = detail;
  const priority = priorityOf(prob);
  const facts: [string, string][] = [
    ["Amount", myr(txn.amount_myr)],
    ["Time", txn.txn_ts.replace("T", " ")],
    ["Channel", txn.channel],
    ["Merchant", txn.merchant_cat],
    ["Foreign", txn.is_foreign ? "Yes" : "No"],
    ["First-seen device", txn.device_new ? "Yes" : "No"],
    ["Hour of day", String(txn.hour_of_day)],
    ["Km from home", txn.km_from_home.toFixed(1)],
    ["Txns in last hour", String(txn.txn_count_1h)],
    ["Amount vs 30d avg", `${txn.amt_ratio_30d.toFixed(1)}x`],
    ["Account age (days)", String(txn.account_age_days)],
  ];

  return (
    <div className="space-y-6">
      {back}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardDescription>Customer {txn.customer_id}</CardDescription>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-4xl font-semibold">
                  <ProbBadge prob={prob} />
                </span>
                <TdBadge />
                <SqlPanel sql={sql} />
              </div>
              <CardDescription>
                Fraud probability from XGBoostPredict{priority ? `. ${SLA[priority]}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <h2 className="text-sm font-semibold">Reason codes</h2>
              <ul className="flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <li key={r}>
                    <Badge variant="outline">{r}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Transaction #{txn.txn_id}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
        <CopilotChat txnId={txn.txn_id} />
      </div>
    </div>
  );
}
