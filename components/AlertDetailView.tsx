"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAlert } from "@/lib/api";
import { myr, num } from "@/lib/format";
import type { AlertDetail } from "@/lib/types";
import { priorityOf, ProbBadge } from "./ProbBadge";
import { SqlPanel } from "./SqlPanel";
import { TdBadge } from "./TdBadge";

const BAND = { P1: "Priority 1: score of 90% or higher", P2: "Priority 2: score of 80-89%" };

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

  const { txn, prob, reasons, sql, customer, sql_customer } = detail;
  const priority = priorityOf(prob);
  const when = (ts: string) => ts.replace("T", " ");
  const customerFacts: [string, string][] = [
    ["Customer ID", String(customer.customer_id)],
    ["Account age (days)", num(customer.account_age_days)],
    ["Transactions on record", num(customer.txn_count)],
    ["Flagged as alerts", num(customer.flagged_count)],
    ["Average transaction (RM)", myr(customer.avg_amount_myr)],
    ["Total spend (RM)", myr(customer.total_amount_myr)],
    ["First seen", when(customer.first_txn_ts)],
    ["Last seen", when(customer.last_txn_ts)],
  ];
  const facts: [string, string][] = [
    ["Amount", myr(txn.amount_myr)],
    ["Time", when(txn.txn_ts)],
    ["Channel", txn.channel],
    ["Merchant", txn.merchant_cat],
    ["Foreign", txn.is_foreign ? "Yes" : "No"],
    ["First-seen device", txn.device_new ? "Yes" : "No"],
    ["Hour of day", String(txn.hour_of_day)],
    ["Km from home", txn.km_from_home.toFixed(1)],
    ["Txns in last hour", String(txn.txn_count_1h)],
    ["Amount vs 30d avg", `${txn.amt_ratio_30d.toFixed(1)}x`],
  ];

  const factList = (rows: [string, string][]) => (
    <dl className="grid grid-cols-2 gap-4">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase text-muted-foreground">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="space-y-6" data-alert-id={txn.txn_id}>
      {back}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card role="region" aria-labelledby="customer-title">
          <CardHeader>
            <CardTitle id="customer-title">Customer</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <TdBadge />
              <SqlPanel sql={sql_customer} />
            </div>
          </CardHeader>
          <CardContent>{factList(customerFacts)}</CardContent>
        </Card>
        <Card role="region" aria-labelledby="transaction-title">
          <CardHeader>
            <CardTitle id="transaction-title">Transaction</CardTitle>
            <CardDescription>Transaction #{txn.txn_id}</CardDescription>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-4xl font-semibold">
                <ProbBadge prob={prob} />
              </span>
              <TdBadge />
              <SqlPanel sql={sql} />
            </div>
            <CardDescription>
              Fraud probability from XGBoostPredict{priority ? `. ${BAND[priority]}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {factList(facts)}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Reason codes</h2>
              <ul className="flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <li key={r}>
                    <Badge variant="outline">{r}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
