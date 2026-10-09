import { render, screen, within } from "@testing-library/react";
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
    customer: {
      customer_id: 77, account_age_days: 40, txn_count: 321, flagged_count: 4, avg_amount_myr: 120.25,
      total_amount_myr: 38600.5, first_txn_ts: "2025-11-23T08:00:00", last_txn_ts: "2026-01-02T03:04:05",
    },
    sql_customer: "SELECT COUNT(*) FROM customer_txn",
  }),
}));

import { AlertDetailView } from "@/components/AlertDetailView";

it("shows the customer card first, then the transaction card with its facts", async () => {
  render(<AlertDetailView id={1001} />);
  const customer = (await screen.findByRole("region", { name: "Customer" })) as HTMLElement;
  const transaction = screen.getByRole("region", { name: "Transaction" });
  expect(customer.compareDocumentPosition(transaction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const c = within(customer);
  expect(c.getByText("77")).toBeInTheDocument();
  expect(c.getByText("321")).toBeInTheDocument();
  expect(c.getByText("4")).toBeInTheDocument();
  expect(c.getByText("RM 120.25")).toBeInTheDocument();
  expect(c.getByText("RM 38,600.50")).toBeInTheDocument();
  expect(c.getByText("2025-11-23 08:00:00")).toBeInTheDocument();
  expect(c.getByText("2026-01-02 03:04:05")).toBeInTheDocument();
  expect(c.getByText("Account age (days)")).toBeInTheDocument();
  expect(c.getByText("Flagged as alerts")).toBeInTheDocument();

  const t = within(transaction);
  expect(t.getByText("93%")).toBeInTheDocument();
  expect(t.getByText("New device")).toBeInTheDocument();
  expect(t.getByText("Foreign merchant")).toBeInTheDocument();
  expect(t.getByText("Electronics")).toBeInTheDocument();
  expect(t.getByText("RM 4,500.50")).toBeInTheDocument();
  expect(t.getByText("9.5x")).toBeInTheDocument();
  expect(t.getByText("812.4")).toBeInTheDocument();
});

it("has a Computed in Teradata badge and Show SQL control on both cards", async () => {
  render(<AlertDetailView id={1001} />);
  const customer = await screen.findByRole("region", { name: "Customer" });
  const transaction = screen.getByRole("region", { name: "Transaction" });
  for (const card of [customer, transaction]) {
    expect(within(card).getByText(/computed in teradata/i)).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /show sql/i })).toBeInTheDocument();
  }
});

it("no longer offers the free-question copilot", async () => {
  render(<AlertDetailView id={1001} />);
  await screen.findByText("93%");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Why was this flagged?" })).not.toBeInTheDocument();
});

it("links back to the alert queue inside the dashboard", async () => {
  render(<AlertDetailView id={1001} />);
  await screen.findByText("93%");
  expect(screen.getByRole("link", { name: /alert queue/i })).toHaveAttribute("href", "/dashboard#alerts");
});

it("exposes the transaction id as data-alert-id on its root element", async () => {
  const { container } = render(<AlertDetailView id={1001} />);
  await screen.findByRole("region", { name: "Customer" });
  const marked = container.querySelectorAll("[data-alert-id]");
  expect(marked).toHaveLength(1);
  expect(marked[0].getAttribute("data-alert-id")).toBe("1001");
  expect(marked[0]).toContainElement(screen.getByRole("region", { name: "Transaction" }));
});
