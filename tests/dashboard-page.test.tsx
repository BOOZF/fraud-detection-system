import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getKpis: vi.fn().mockResolvedValue({
    total_txn: 100000, fraud_txn: 1234, fraud_rate: 0.01234, alerts_open: 87,
    fraud_by_channel: [{ channel: "Mobile", txn: 50000, fraud: 900 }], sql: ["SELECT 1"],
  }),
  getModel: vi.fn().mockResolvedValue({
    auc: 0.971, gini: 0.942, train_rows: 80000, test_rows: 20000, train_seconds: 12.5, features: ["a"], algorithm: "XGBoost",
  }),
  rescore: vi.fn(),
  getAlerts: vi.fn().mockResolvedValue([
    { txn_id: 7001, amount_myr: 4500.5, channel: "Mobile", merchant_cat: "Electronics", prob: 0.93, txn_ts: "2026-01-02T03:04:05" },
    { txn_id: 7002, amount_myr: 120, channel: "ATM", merchant_cat: "Grocery", prob: 0.81, txn_ts: "2026-01-02T04:00:00" },
  ]),
}));

import DashboardPage from "@/app/(app)/dashboard/page";

it("renders the KPI analysis on top and the alert queue in #alerts below", async () => {
  const { container } = render(<DashboardPage />);
  expect(await screen.findByText("100,000")).toBeInTheDocument();
  expect(screen.getByText("1,234")).toBeInTheDocument();
  expect(screen.getByText("1.23%")).toBeInTheDocument();

  const section = container.querySelector("section#alerts") as HTMLElement;
  expect(section).not.toBeNull();
  expect(await screen.findByRole("link", { name: "#7001" })).toHaveAttribute("href", "/alerts/7001");
  expect(section).toContainElement(screen.getByRole("link", { name: "#7002" }));
  expect(section).toHaveTextContent("2 of 2 alerts match");
});
