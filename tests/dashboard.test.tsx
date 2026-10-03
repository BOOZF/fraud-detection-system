import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const rescore = vi.fn();
const getKpis = vi.fn();
vi.mock("@/lib/api", () => ({
  getKpis: (...a: unknown[]) => getKpis(...a),
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

beforeEach(() => {
  getKpis.mockResolvedValue(kpis);
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
