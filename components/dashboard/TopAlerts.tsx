"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertBriefDialog } from "@/components/brief/AlertBriefDialog";
import { ProbBadge } from "@/components/ProbBadge";
import { TdBadge } from "@/components/TdBadge";
import { getAlerts } from "@/lib/api";
import { myr } from "@/lib/format";
import type { Alert } from "@/lib/types";
import { Panel } from "./Panel";

/** The highest-probability alerts, the first thing an analyst picks up. Click a probability for the copilot brief. */
export function TopAlerts() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Alert | null>(null);

  useEffect(() => {
    getAlerts(0.8, 5).then(setAlerts).catch(() => setFailed(true));
  }, []);

  return (
    <Panel title="Top alerts" description="Highest fraud probability first." actions={<><TdBadge /><Link href="#alerts" className="text-xs font-medium text-primary hover:underline">View all</Link></>}>
      {failed ? (
        <p className="text-sm text-muted-foreground">Could not load alerts.</p>
      ) : alerts === null ? (
        <p role="status" className="text-sm text-muted-foreground">Loading alerts...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Alert</th>
              <th className="pb-2 font-medium">Channel</th>
              <th className="pb-2 text-right font-medium">Amount</th>
              <th className="pb-2 text-right font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.txn_id} className="border-t transition-colors hover:bg-muted/50">
                <td className="py-2">
                  <Link href={`/alerts/${a.txn_id}`} className="font-medium text-primary hover:underline">{`#${a.txn_id}`}</Link>
                </td>
                <td className="py-2 text-muted-foreground">{a.channel}</td>
                <td className="py-2 text-right tabular-nums">{myr(a.amount_myr)}</td>
                <td className="py-2 text-right">
                  <button type="button" aria-label={`Open copilot brief for #${a.txn_id}`} onClick={() => setOpen(a)} className="rounded-full transition-transform hover:scale-105">
                    <ProbBadge prob={a.prob} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && <AlertBriefDialog txnId={open.txn_id} prob={open.prob} open onOpenChange={(o) => !o && setOpen(null)} />}
    </Panel>
  );
}
