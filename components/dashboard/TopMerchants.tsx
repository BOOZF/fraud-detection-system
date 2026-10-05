import { TdBadge } from "@/components/TdBadge";
import { num, pct } from "@/lib/format";
import type { MerchantRow } from "@/lib/overview";
import { Panel } from "./Panel";

/** Merchant categories by fraud count, with each one's fraud rate: where the risk sits. */
export function TopMerchants({ rows }: { rows: MerchantRow[] }) {
  const top = rows.slice(0, 5);
  const max = Math.max(1, ...top.map((m) => m.fraud));
  return (
    <Panel title="Top merchants" description="Categories with the most fraud." actions={<TdBadge />}>
      <ul className="space-y-3">
        {top.map((m) => (
          <li key={m.merchant_cat} className="group">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{m.merchant_cat}</span>
              <span className="tabular-nums text-muted-foreground">
                {num(m.fraud)} fraud · <b className="font-semibold text-foreground">{pct(m.txn ? m.fraud / m.txn : 0, 1)}</b>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/70 transition-[width] duration-500 group-hover:bg-primary" style={{ width: `${(m.fraud / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
