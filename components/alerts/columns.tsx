import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { myr } from "@/lib/format";
import type { Alert } from "@/lib/types";
import { ProbBadge } from "@/components/ProbBadge";
import type { DataTableFeatures } from "./data-table-features";

const columnHelper = createColumnHelper<DataTableFeatures, Alert>();

/** Columns for the alert queue; `onOpenBrief` is called when a row's probability is clicked. */
export const createColumns = (onOpenBrief: (alert: Alert) => void) =>
  columnHelper.columns([
  columnHelper.accessor("txn_id", {
    header: "Transaction ID",
    sortFn: "basic",
    enableColumnFilter: false,
    cell: (info) => (
      <Link href={`/alerts/${info.getValue()}`} className="font-medium text-primary underline-offset-4 hover:underline">
        #{info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("prob", {
    header: "Probability",
    sortFn: "basic",
    filterFn: "percentBetween",
    cell: (info) => (
      <button
        type="button"
        title="Open copilot brief"
        aria-label={`Open copilot brief for #${info.row.original.txn_id}`}
        onClick={() => onOpenBrief(info.row.original)}
        className="cursor-pointer rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ProbBadge prob={info.getValue()} />
      </button>
    ),
  }),
  columnHelper.accessor("amount_myr", {
    header: "Amount",
    sortFn: "basic",
    filterFn: "numberBetween",
    cell: (info) => <span className="tabular-nums">{myr(info.getValue())}</span>,
  }),
  columnHelper.accessor("channel", { header: "Channel", sortFn: "text", enableColumnFilter: false }),
  columnHelper.accessor("merchant_cat", { header: "Merchant", sortFn: "text", enableColumnFilter: false }),
  columnHelper.accessor("txn_ts", {
    header: "Time",
    sortFn: "text",
    enableColumnFilter: false,
    cell: (info) => <span className="tabular-nums">{info.getValue().replace("T", " ")}</span>,
  }),
]);
