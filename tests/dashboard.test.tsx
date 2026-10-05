import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const rescore = vi.fn();
const getKpis = vi.fn();
const getOverview = vi.fn();
const getAlerts = vi.fn();
vi.mock("@/lib/api", () => ({
  getKpis: (...a: unknown[]) => getKpis(...a),
  getOverview: (...a: unknown[]) => getOverview(...a),
  getAlerts: (...a: unknown[]) => getAlerts(...a),
  getBrief: vi.fn(),
  errorMessage: (e: unknown) => String(e),
  getModel: vi.fn().mockResolvedValue({
    auc: 0.971, gini: 0.942, train_rows: 80000, test_rows: 20000, train_seconds: 12.5,
    features: ["amount_myr", "is_foreign"], algorithm: "XGBoost",
  }),
  rescore: (...a: unknown[]) => rescore(...a),
}));

import { DashboardView } from "@/components/DashboardView";

const kpis = {
  total_txn: 100000, fraud_txn: 1234, fraud_rate: 0.01234, alerts_open: 87,
  fraud_by_channel: [{ channel: "Mobile", txn: 50000, fraud: 900 }, { channel: "ATM", txn: 10000, fraud: 334 }],
  sql: ["SELECT COUNT(*) FROM txns"],
};

// 60 days ending 2026-09-28: Mobile fraud 3/day for the older 30 days, then 6/day (+100%); ATM 1/day throughout.
const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 8, 28) - (59 - i) * 86_400_000).toISOString().slice(0, 10));
const overview = {
  daily: days.flatMap((date, i) => [
    { date, channel: "Mobile", txn: 100, fraud: i < 30 ? 3 : 6, alerts: 1, amount: 900 },
    { date, channel: "ATM", txn: 20, fraud: 1, alerts: 0, amount: 100 },
  ]),
  merchants: [
    { merchant_cat: "CRYPTO", txn: 900, fraud: 120, alerts: 40, amount: 5000 },
    { merchant_cat: "GROCERY", txn: 9000, fraud: 30, alerts: 2, amount: 7000 },
  ],
  sql: ["SELECT d FROM txn"],
};

beforeEach(() => {
  vi.useRealTimers();
  getKpis.mockResolvedValue(kpis);
  getOverview.mockResolvedValue(overview);
  getAlerts.mockResolvedValue([
    { txn_id: 7001, amount_myr: 4500.5, channel: "Mobile", merchant_cat: "CRYPTO", prob: 0.93, txn_ts: "2026-09-28 03:04:05" },
    { txn_id: 7002, amount_myr: 120, channel: "ATM", merchant_cat: "GROCERY", prob: 0.81, txn_ts: "2026-09-28 04:00:00" },
  ]);
  rescore.mockReset();
});

it("shows KPI numbers, channel chart and model card", async () => {
  render(<DashboardView />);
  expect(await screen.findByText("100,000")).toBeInTheDocument();
  expect(screen.getByText("1,234")).toBeInTheDocument();
  expect(screen.getByText("1.23%")).toBeInTheDocument();
  expect(screen.getByText("87")).toBeInTheDocument();
  expect(screen.getByText("Mobile")).toBeInTheDocument();
  expect(await screen.findByText("0.971")).toBeInTheDocument();
  expect(screen.getByText("XGBoost")).toBeInTheDocument();
  expect(screen.getAllByText(/computed in teradata/i).length).toBeGreaterThanOrEqual(4);
});

it("re-score calls the API and shows rows, seconds and the SQL", async () => {
  rescore.mockResolvedValue({ rows: 20000, seconds: 3.2, sql: "SELECT * FROM XGBoostPredict(...)" });
  const user = userEvent.setup();
  render(<DashboardView />);
  await screen.findByText("100,000");
  await user.click(screen.getByRole("button", { name: /re-score/i }));
  const status = await screen.findByRole("status");
  expect(within(status).getByText(/20,000 rows/)).toBeInTheDocument();
  expect(within(status).getByText(/3\.2 s/)).toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: /show sql/i })[0]);
  expect(screen.getByText("SELECT * FROM XGBoostPredict(...)")).toBeInTheDocument();
});


it("greets the analyst according to the time of day", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 5, 9, 30));
  const { unmount } = render(<DashboardView />);
  expect(await screen.findByRole("heading", { level: 1, name: /good morning, analyst/i })).toBeInTheDocument();
  unmount();
  vi.setSystemTime(new Date(2026, 9, 5, 15, 0));
  render(<DashboardView />);
  expect(await screen.findByRole("heading", { level: 1, name: /good afternoon, analyst/i })).toBeInTheDocument();
});

it("shows each KPI with its change against the previous 30 days", async () => {
  render(<DashboardView />);
  await screen.findByText("100,000");
  // fraud per day: 6 + 1 = 7 now, 3 + 1 = 4 before -> +75%; more fraud is bad news
  const fraud = within(screen.getByRole("group", { name: "Fraud transactions" })).getByTestId("kpi-delta");
  expect(fraud).toHaveTextContent("+75.0%");
  expect(fraud).toHaveAttribute("data-tone", "bad");
  // transactions are flat (120 a day in both periods): no rise to celebrate or fear
  expect(within(screen.getByRole("group", { name: "Transactions" })).getByTestId("kpi-delta")).toHaveAttribute("data-tone", "flat");
});

it("clicking a channel bar focuses the trend chart on that channel, and clicking again goes back to all", async () => {
  const user = userEvent.setup();
  render(<DashboardView />);
  await screen.findByText("100,000");
  expect(screen.getByTestId("trend-total")).toHaveTextContent("210"); // last 30 days: 30 x (6 + 1)
  await user.click(screen.getByRole("button", { name: /ATM:/ }));
  expect(screen.getByTestId("trend-total")).toHaveTextContent("30"); // 30 x 1
  await user.click(screen.getByRole("button", { name: /ATM:/ }));
  expect(screen.getByTestId("trend-total")).toHaveTextContent("210");
});

it("lists the top alerts as links and the riskiest merchant categories", async () => {
  render(<DashboardView />);
  const alerts = await screen.findByRole("region", { name: "Top alerts" });
  expect(await within(alerts).findByRole("link", { name: "#7001" })).toHaveAttribute("href", "/alerts/7001");
  expect(within(alerts).getByText("RM 4,500.50")).toBeInTheDocument();
  expect(getAlerts).toHaveBeenCalledWith(0.8, 5);
  const merchants = await screen.findByRole("region", { name: "Top merchants" });
  const first = within(merchants).getAllByRole("listitem")[0];
  expect(first).toHaveTextContent("CRYPTO");
  expect(first).toHaveTextContent("13.3%"); // 120 / 900
});

it("keeps the rest of the dashboard when the trend data cannot be loaded", async () => {
  getOverview.mockRejectedValue(new Error("boom"));
  render(<DashboardView />);
  expect(await screen.findByText("100,000")).toBeInTheDocument();
  expect(await screen.findByText(/trend data is unavailable/i)).toBeInTheDocument();
});
