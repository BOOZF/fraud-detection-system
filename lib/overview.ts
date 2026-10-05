/** Pure helpers behind the dashboard charts: daily rows from /api/overview in, series and period changes out. */
export type Metric = "fraud" | "alerts" | "txn";
export type DailyRow = { date: string; channel: string; txn: number; fraud: number; alerts: number; amount: number };
export type MerchantRow = { merchant_cat: string; txn: number; fraud: number; alerts: number; amount: number };
export type Overview = { daily: DailyRow[]; merchants: MerchantRow[]; sql: string[] };
export type Point = { date: string; value: number };
type Query = { metric: Metric; days: number; channel?: string | null };

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const lastDay = (rows: DailyRow[]) => rows.reduce((m, r) => (r.date > m ? r.date : m), "");

/** One point per calendar day of the last `days` days (ending at the last day with data); days with no rows are 0. */
export function seriesFor(rows: DailyRow[], { metric, days, channel }: Query): Point[] {
  if (rows.length === 0) return [];
  const end = toMs(lastDay(rows));
  const sums = new Map<string, number>();
  for (const r of rows) {
    if (channel && r.channel !== channel) continue;
    sums.set(r.date, (sums.get(r.date) ?? 0) + r[metric]);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = toDate(end - (days - 1 - i) * DAY);
    return { date, value: sums.get(date) ?? 0 };
  });
}

/** The last `days` days against the `days` before them. `change` is a fraction (0.1 = +10%), null if nothing before. */
export function periodChange(rows: DailyRow[], q: Query): { current: number; previous: number; change: number | null } {
  const both = seriesFor(rows, { ...q, days: q.days * 2 });
  const sum = (ps: Point[]) => ps.reduce((a, p) => a + p.value, 0);
  const current = sum(both.slice(q.days));
  const previous = sum(both.slice(0, q.days));
  return { current, previous, change: previous === 0 ? null : (current - previous) / previous };
}

/** Per-channel totals over the last `days` days (all data if omitted), most fraud first. */
export function channelTotals(rows: DailyRow[], days?: number) {
  const from = days && rows.length ? toDate(toMs(lastDay(rows)) - (days - 1) * DAY) : "";
  const totals = new Map<string, { channel: string; txn: number; fraud: number; alerts: number }>();
  for (const r of rows) {
    if (r.date < from) continue;
    const t = totals.get(r.channel) ?? { channel: r.channel, txn: 0, fraud: 0, alerts: 0 };
    t.txn += r.txn;
    t.fraud += r.fraud;
    t.alerts += r.alerts;
    totals.set(r.channel, t);
  }
  return [...totals.values()].sort((a, b) => b.fraud - a.fraud || b.txn - a.txn);
}
