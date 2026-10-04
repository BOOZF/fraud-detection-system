"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, getBrief } from "@/lib/api";
import type { Brief, BriefCitation } from "@/lib/types";
import { myr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DocumentViewer } from "@/components/viewer/DocumentViewer";
import { ProbBadge } from "../ProbBadge";
import { TdBadge } from "../TdBadge";

// Briefs are cached on the server too, but this makes re-opening an alert instant with no request at all.
const cache = new Map<number, Brief>();

const chipKey = (c: BriefCitation) => `${c.doc}|${c.chunk_id}`;

function BriefSkeleton() {
  return (
    <div role="status" aria-label="Loading brief" className="space-y-4">
      <p className="text-sm text-muted-foreground">Retrieving policies from Teradata... Writing the brief...</p>
      <Skeleton className="h-16 w-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** The transaction at a glance and the rule-based reasons it was flagged (these never come from the language model). */
function Summary({ brief }: { brief: Brief }) {
  const f = brief.facts;
  return (
    <section aria-label="Transaction summary" className="space-y-3 rounded-lg border bg-muted/40 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Fact label="Amount" value={myr(f.amount_myr)} />
        <Fact label="Channel" value={f.channel} />
        <Fact label="Merchant" value={f.merchant_cat} />
        <Fact label="Time" value={f.txn_ts.slice(0, 16)} />
      </dl>
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Risk indicators</p>
        <ul className="flex flex-wrap gap-1.5">
          {brief.indicators.map((r) => (
            <li key={r}>
              <Badge variant="warning">{r}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BriefBody({ txnId, prob }: { txnId: number; prob: number }) {
  const [fetched, setFetched] = useState<{ id: number; brief?: Brief; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<BriefCitation | null>(null);

  useEffect(() => {
    if (cache.has(txnId)) return;
    let cancelled = false;
    getBrief(txnId)
      .then((brief) => {
        cache.set(txnId, brief);
        if (!cancelled) setFetched({ id: txnId, brief });
      })
      .catch((e: unknown) => {
        if (!cancelled) setFetched({ id: txnId, error: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [txnId, attempt]);

  const retry = () => {
    cache.delete(txnId);
    setFetched(null);
    setAttempt((a) => a + 1);
  };

  const brief = cache.get(txnId);
  const error = !brief && fetched?.id === txnId ? fetched.error : undefined;
  const showViewer = brief && active;

  return (
    <>
      <div className="space-y-2 border-b p-6 pr-12">
        <DialogTitle>Alert #{txnId}</DialogTitle>
        <DialogDescription>Copilot brief: answers to the standard questions, cited from the bank&apos;s policies.</DialogDescription>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-semibold">
            <ProbBadge prob={brief?.prob ?? prob} />
          </span>
          {brief && (
            <p className="font-medium">
              <span className="mr-2 text-xs font-normal uppercase tracking-wide text-muted-foreground">Recommended action</span>
              {brief.headline}
            </p>
          )}
        </div>
      </div>

      <div className={cn("grid min-h-0 content-start gap-4 overflow-y-auto p-6 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden", showViewer && "lg:grid-cols-2")}>
        <div className="min-h-0 space-y-4 lg:overflow-y-auto lg:pr-1">
          {error && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <span>Could not load the brief: {error}</span>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </div>
          )}
          {!brief && !error && <BriefSkeleton />}
          {brief && <Summary brief={brief} />}
          {brief?.items.map((item) => (
            <section key={item.question} className="space-y-2 rounded-lg border bg-card p-4">
              <h3 className="text-sm font-medium text-muted-foreground">{item.question}</h3>
              <p className="text-base font-semibold leading-snug">{item.verdict}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {item.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {item.citations.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {item.citations.map((c) => {
                    const isActive = !!active && chipKey(active) === chipKey(c);
                    return (
                      <li key={chipKey(c)}>
                        <button
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setActive(c)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent",
                            isActive && "border-primary bg-accent font-medium",
                          )}
                        >
                          <FileText aria-hidden className="size-3" />
                          {c.doc} · {c.section}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
        {showViewer && (
          <DocumentViewer
            target={{ doc: active.doc, section: active.section, page: active.page, text: active.text, chunkId: active.chunk_id }}
            onClose={() => setActive(null)}
            className="min-h-96 lg:h-full"
          />
        )}
      </div>

      {brief && (
        <div className="flex flex-wrap items-center gap-3 border-t px-6 py-3 text-xs text-muted-foreground">
          <span>
            Retrieval {brief.retrieval_ms} ms | LLM {(brief.llm_ms / 1000).toFixed(1)} s
          </span>
          <TdBadge />
        </div>
      )}
    </>
  );
}

export function AlertBriefDialog({
  txnId,
  prob,
  open,
  onOpenChange,
}: {
  txnId: number;
  prob: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-alert-id={txnId} className="h-[90vh] max-w-[95vw] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-y-auto p-0 sm:max-w-[min(1200px,95vw)]">
        <BriefBody txnId={txnId} prob={prob} />
      </DialogContent>
    </Dialog>
  );
}
