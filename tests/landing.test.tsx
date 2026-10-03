import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const getKpis = vi.fn();
const getModel = vi.fn();
const getAlerts = vi.fn();
const getAlert = vi.fn();
vi.mock("@/lib/api", () => ({
  getKpis: (...a: unknown[]) => getKpis(...a),
  getModel: (...a: unknown[]) => getModel(...a),
  getAlerts: (...a: unknown[]) => getAlerts(...a),
  getAlert: (...a: unknown[]) => getAlert(...a),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import Landing from "@/app/(marketing)/page";

beforeEach(() => {
  window.sessionStorage.clear();
  push.mockReset();
  getKpis.mockReset();
  getModel.mockReset();
  getAlerts.mockReset();
  getAlert.mockReset();
});

function mockOk() {
  getKpis.mockResolvedValue({
    total_txn: 200000, fraud_txn: 2468, fraud_rate: 0.01234, alerts_open: 87, fraud_by_channel: [], sql: [],
  });
  getModel.mockResolvedValue({
    auc: 0.971, gini: 0.942, train_rows: 160000, test_rows: 40000, train_seconds: 12.5, features: [], algorithm: "XGBoost",
  });
  getAlerts.mockResolvedValue([
    { txn_id: 1001, amount_myr: 4500.5, channel: "Mobile", merchant_cat: "Electronics", prob: 0.93, txn_ts: "2026-01-02T03:04:05" },
  ]);
  getAlert.mockResolvedValue({
    txn: { txn_id: 1001 }, prob: 0.93, reasons: ["New device", "Foreign merchant"], sql: "SELECT 1",
  });
}

it("shows the headline, the bank name and a Login button that opens the dialog", async () => {
  mockOk();
  const user = userEvent.setup();
  render(<Landing />);
  expect(screen.getByRole("heading", { level: 1, name: /catch card fraud where the data lives/i })).toBeInTheDocument();
  expect(screen.getAllByText("Malaysia XX Bank").length).toBeGreaterThan(0);
  expect(screen.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#how-it-works");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Login" })[0]);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("Username")).toBeInTheDocument();
});

it("offers Open dashboard instead of Login when already signed in", async () => {
  mockOk();
  window.sessionStorage.setItem("xxbank_auth", "1");
  const user = userEvent.setup();
  render(<Landing />);
  const buttons = await screen.findAllByRole("button", { name: "Open dashboard" });
  expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();
  await user.click(buttons[0]);
  expect(push).toHaveBeenCalledWith("/dashboard");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("shows the five criteria and the how-it-works steps below the hero", async () => {
  mockOk();
  render(<Landing />);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
  expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
  expect(await screen.findByText("200,000 rows trained and scored in Teradata, training took 12.5 s")).toBeInTheDocument();
});

it("switches between Detect, Explain and Govern with live data", async () => {
  mockOk();
  const user = userEvent.setup();
  render(<Landing />);

  expect(await screen.findByText("200,000")).toBeInTheDocument();
  expect(await screen.findByText("0.971")).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Explain" }));
  expect(await screen.findByText("New device")).toBeInTheDocument();
  expect(screen.getByText("Foreign merchant")).toBeInTheDocument();
  expect(screen.getByText("93%")).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Govern" }));
  expect(screen.getByText("No rows exported")).toBeInTheDocument();
  expect(screen.getByText("SQL you can audit")).toBeInTheDocument();
});

it("falls back to sample text when the API is unavailable", async () => {
  getKpis.mockRejectedValue(new Error("down"));
  getModel.mockRejectedValue(new Error("down"));
  getAlerts.mockRejectedValue(new Error("down"));
  const user = userEvent.setup();
  render(<Landing />);

  expect(await screen.findByText(/sample data shown/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Explain" }));
  expect(await screen.findByText("New device")).toBeInTheDocument();
  expect(screen.getByText(/sample alert/i)).toBeInTheDocument();
});
