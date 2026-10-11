import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type { ShapDriver } from "@/lib/types";

const drivers: ShapDriver[] = [
  { feature: "is_foreign", label: "Foreign transaction", value: "Yes", phrase: "Foreign transaction", shap: 2.05, direction: "up", strength: "strongly" },
  { feature: "txn_count_1h", label: "Transactions in last hour", value: "0", phrase: "0 transactions in the last hour", shap: -0.17, direction: "down", strength: "slightly" },
];

vi.mock("@/lib/api", () => ({
  getAlert: vi.fn().mockResolvedValue({
    txn: {
      txn_id: 1001, customer_id: 77, txn_ts: "2026-01-02T03:04:05", amount_myr: 4500.5, channel: "Mobile",
      merchant_cat: "Electronics", is_foreign: 1, device_new: 1, hour_of_day: 3, km_from_home: 812.4,
      txn_count_1h: 6, amt_ratio_30d: 9.5, account_age_days: 40, is_fraud: 1,
    },
    prob: 0.93,
    reasons: ["Foreign transaction"],
    sql: "SELECT 1",
    drivers: [
      { feature: "is_foreign", label: "Foreign transaction", value: "Yes", phrase: "Foreign transaction", shap: 2.05, direction: "up", strength: "strongly" },
      { feature: "txn_count_1h", label: "Transactions in last hour", value: "0", phrase: "0 transactions in the last hour", shap: -0.17, direction: "down", strength: "slightly" },
    ],
    sql_drivers: "SELECT * FROM txn_shap WHERE txn_id = 1001",
    customer: {
      customer_id: 77, account_age_days: 40, txn_count: 321, flagged_count: 4, avg_amount_myr: 120.25,
      total_amount_myr: 38600.5, first_txn_ts: "2025-11-23T08:00:00", last_txn_ts: "2026-01-02T03:04:05",
    },
    sql_customer: "SELECT 1",
  }),
}));

import { AlertDetailView } from "@/components/AlertDetailView";
import { ShapDrivers } from "@/components/ShapDrivers";

it("lists each driver with its value and which way it pushes the score", () => {
  render(<ShapDrivers drivers={drivers} />);
  const items = within(screen.getByRole("list", { name: /shap drivers/i })).getAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent("Foreign transaction");
  expect(items[0]).toHaveTextContent("strongly raises the risk");
  expect(items[1]).toHaveTextContent("slightly lowers the risk");
});

it("keeps the raw log-odds out of the text and in a tooltip", () => {
  render(<ShapDrivers drivers={drivers} />);
  const [first] = screen.getAllByRole("listitem");
  expect(first).toHaveAttribute("title", "SHAP +2.050 (log-odds)");
  expect(first).not.toHaveTextContent("2.05");
});

it("shows the SHAP explanation on the alert page in place of the rule badges", async () => {
  render(<AlertDetailView id={1001} />);
  const region = await screen.findByRole("region", { name: "Why the model scored it this way" });
  expect(within(region).getByText("Transactions in last hour")).toBeInTheDocument();
  expect(within(region).getByRole("button", { name: /show sql/i })).toBeInTheDocument();
  expect(screen.queryByText("Reason codes")).not.toBeInTheDocument();
});
