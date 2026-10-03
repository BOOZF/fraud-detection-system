import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getAlert: vi.fn().mockResolvedValue({
    txn: {
      txn_id: 1001, customer_id: 77, txn_ts: "2026-01-02T03:04:05", amount_myr: 4500.5, channel: "Mobile",
      merchant_cat: "Electronics", is_foreign: 1, device_new: 1, hour_of_day: 3, km_from_home: 812.4,
      txn_count_1h: 6, amt_ratio_30d: 9.5, account_age_days: 40, is_fraud: 1,
    },
    prob: 0.93,
    reasons: ["New device", "Foreign merchant"],
    sql: "SELECT * FROM XGBoostPredict(...)",
  }),
  askCopilot: vi.fn(),
}));

import { AlertDetailView } from "@/components/AlertDetailView";

it("shows transaction facts, probability, reasons and the copilot", async () => {
  render(<AlertDetailView id={1001} />);
  expect(await screen.findByText("93%")).toBeInTheDocument();
  expect(screen.getByText("New device")).toBeInTheDocument();
  expect(screen.getByText("Foreign merchant")).toBeInTheDocument();
  expect(screen.getByText("Electronics")).toBeInTheDocument();
  expect(screen.getByText(/4,500\.50/)).toBeInTheDocument();
  expect(screen.getByText("Customer 77", { exact: false })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Why was this flagged?" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /show sql/i })).toBeInTheDocument();
});

it("links back to the alert queue inside the dashboard", async () => {
  render(<AlertDetailView id={1001} />);
  await screen.findByText("93%");
  expect(screen.getByRole("link", { name: /alert queue/i })).toHaveAttribute("href", "/dashboard#alerts");
});
