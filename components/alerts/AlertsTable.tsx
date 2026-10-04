"use client";

import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { useTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAlerts } from "@/lib/api";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TdBadge } from "../TdBadge";
import { AlertBriefDialog } from "../brief/AlertBriefDialog";
import { createColumns } from "./columns";
import { RangeFilter } from "./RangeFilter";
import { features } from "./data-table-features";

const PAGE_SIZE = 10;
const RIGHT_ALIGNED = new Set(["amount_myr"]);

/** 1-based page numbers to show: first, last, current +/- 1, with "gap" markers between runs. */
function pageWindow(current: number, count: number): (number | "gap")[] {
  const wanted = new Set([1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const AMOUNT_STEP = 10;
const rm = (n: number) => `RM ${n.toLocaleString("en-US")}`;
const pct = (n: number) => `${n}%`;

/**
 * Fixed slider spans. A slider left at its full span means "no filter", so an alert outside the span
 * (for example an amount above RM 5,000) is never hidden by default.
 */
const BOUNDS: { prob: [number, number]; amount: [number, number] } = {
  prob: [0, 100],
  amount: [0, 5000],
};

const sameRange = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

function AlertsTableView({ alerts }: { alerts: Alert[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "prob", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const bounds = BOUNDS;
  const [probRange, setProbRange] = useState<[number, number]>(bounds.prob);
  const [amountRange, setAmountRange] = useState<[number, number]>(bounds.amount);

  const [briefAlert, setBriefAlert] = useState<Alert | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const columns = useMemo(
    () =>
      createColumns((alert) => {
        setBriefAlert(alert);
        setBriefOpen(true);
      }),
    [],
  );

  const table = useTable({
    features,
    data: alerts,
    columns,
    getRowId: (row) => String(row.txn_id),
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
  });

  const applyRange = (id: "prob" | "amount_myr", range: [number, number], full: [number, number]) => {
    // The full span means "no filter", so the column filter is removed instead of set.
    table.getColumn(id)?.setFilterValue(sameRange(range, full) ? undefined : range);
    // A new filter changes the result set, so go back to the first page.
    table.setPageIndex(0);
  };
  const filtered = !sameRange(probRange, bounds.prob) || !sameRange(amountRange, bounds.amount);
  const resetFilters = () => {
    setProbRange(bounds.prob);
    setAmountRange(bounds.amount);
    table.getColumn("prob")?.setFilterValue(undefined);
    table.getColumn("amount_myr")?.setFilterValue(undefined);
    table.setPageIndex(0);
  };

  const matched = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = table.getPageCount();
  const from = matched === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(matched, (pageIndex + 1) * pageSize);
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  const go = (e: React.MouseEvent, run: () => void, enabled = true) => {
    e.preventDefault();
    if (enabled) run();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <RangeFilter
          id="filter-prob"
          label="Probability range"
          noun="probability"
          bounds={bounds.prob}
          value={probRange}
          step={1}
          format={pct}
          onChange={(next) => {
            setProbRange(next);
            applyRange("prob", next, bounds.prob);
          }}
        />
        <RangeFilter
          id="filter-amount"
          label="Amount range"
          noun="amount"
          bounds={bounds.amount}
          value={amountRange}
          step={AMOUNT_STEP}
          format={rm}
          onChange={(next) => {
            setAmountRange(next);
            applyRange("amount_myr", next, bounds.amount);
          }}
        />
        <div className="flex items-center gap-3 pb-1">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {matched} of {alerts.length} alerts match
          </p>
          {filtered && (
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          )}
        </div>
        <TdBadge className="mb-1 ml-auto" />
      </div>

      <div className="rounded-md border">
        <Table className="min-w-[720px]">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const dir = header.column.getIsSorted();
                  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                      className={cn(RIGHT_ALIGNED.has(header.column.id) && "text-right")}
                    >
                      <button
                        type="button"
                        onClick={() => header.column.toggleSorting()}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <table.FlexRender header={header} />
                        <Icon aria-hidden className="size-3.5" />
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} data-alert-id={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className={cn(RIGHT_ALIGNED.has(cell.column.id) && "text-right")}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-6 text-center text-muted-foreground">
                  No alerts match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Showing {from}-{to} of {matched}
        </p>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#alerts"
                aria-disabled={!canPrev}
                className={cn(!canPrev && "pointer-events-none opacity-50")}
                onClick={(e) => go(e, () => table.previousPage(), canPrev)}
              />
            </PaginationItem>
            {pageWindow(pageIndex + 1, pageCount).map((p, i) => (
              <PaginationItem key={p === "gap" ? `gap-${i}` : p}>
                {p === "gap" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#alerts"
                    aria-label={`Go to page ${p}`}
                    isActive={p === pageIndex + 1}
                    onClick={(e) => go(e, () => table.setPageIndex(p - 1))}
                  >
                    {p}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#alerts"
                aria-disabled={!canNext}
                className={cn(!canNext && "pointer-events-none opacity-50")}
                onClick={(e) => go(e, () => table.nextPage(), canNext)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      {briefAlert && (
        <AlertBriefDialog txnId={briefAlert.txn_id} prob={briefAlert.prob} open={briefOpen} onOpenChange={setBriefOpen} />
      )}
    </div>
  );
}

export function AlertsTable() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setAlerts(null);
    getAlerts()
      .then(setAlerts)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    // Async fetch; state is only set from the promise callbacks.
    getAlerts()
      .then(setAlerts)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error)
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <span>API error: {error}</span>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          Retry
        </Button>
      </div>
    );

  if (!alerts)
    return (
      <div role="status" aria-label="Loading alerts" className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );

  return <AlertsTableView alerts={alerts} />;
}
