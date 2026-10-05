import { expect, it } from "vitest";
import { channelTotals, periodChange, seriesFor, type DailyRow } from "@/lib/overview";

// Four days, two channels. Hand-computed expectations below.
const row = (date: string, channel: string, txn: number, fraud: number, alerts = 0): DailyRow => ({ date, channel, txn, fraud, alerts, amount: txn * 10 });
const ROWS: DailyRow[] = [
  row("2026-07-01", "ATM", 10, 1),
  row("2026-07-01", "FPX", 20, 2),
  row("2026-07-02", "ATM", 10, 3),
  row("2026-07-04", "FPX", 30, 5, 2), // 2026-07-03 has no rows at all
];

it("builds one point per calendar day ending at the last data day, filling gaps with zero", () => {
  expect(seriesFor(ROWS, { metric: "fraud", days: 4 })).toEqual([
    { date: "2026-07-01", value: 3 },
    { date: "2026-07-02", value: 3 },
    { date: "2026-07-03", value: 0 },
    { date: "2026-07-04", value: 5 },
  ]);
});

it("keeps only the last N days, and can be limited to one channel", () => {
  expect(seriesFor(ROWS, { metric: "fraud", days: 2 }).map((p) => p.value)).toEqual([0, 5]);
  expect(seriesFor(ROWS, { metric: "txn", days: 4, channel: "ATM" }).map((p) => p.value)).toEqual([10, 10, 0, 0]);
  expect(seriesFor(ROWS, { metric: "alerts", days: 4 }).map((p) => p.value)).toEqual([0, 0, 0, 2]);
});

it("starts the window before the first data day when asked for more days than exist", () => {
  const s = seriesFor(ROWS, { metric: "txn", days: 6 });
  expect(s[0].date).toBe("2026-06-29");
  expect(s).toHaveLength(6);
});

it("compares the last N days with the N days before", () => {
  // last 2 days (3rd, 4th) fraud = 0 + 5 = 5; the 2 before (1st, 2nd) = 3 + 3 = 6
  const c = periodChange(ROWS, { metric: "fraud", days: 2 });
  expect(c.current).toBe(5);
  expect(c.previous).toBe(6);
  expect(c.change).toBeCloseTo(-1 / 6, 10);
});

it("has no percentage when the earlier period is empty", () => {
  expect(periodChange(ROWS, { metric: "alerts", days: 2 })).toEqual({ current: 2, previous: 0, change: null });
});

it("totals every channel over a window, largest first", () => {
  expect(channelTotals(ROWS)).toEqual([
    { channel: "FPX", txn: 50, fraud: 7, alerts: 2 },
    { channel: "ATM", txn: 20, fraud: 4, alerts: 0 },
  ]);
  expect(channelTotals(ROWS, 1)).toEqual([{ channel: "FPX", txn: 30, fraud: 5, alerts: 2 }]);
});

it("returns an empty series for no data", () => {
  expect(seriesFor([], { metric: "fraud", days: 7 })).toEqual([]);
  expect(periodChange([], { metric: "fraud", days: 7 })).toEqual({ current: 0, previous: 0, change: null });
});
