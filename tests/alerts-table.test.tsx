import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import type { Alert } from "@/lib/types";

const getAlerts = vi.fn();
const getBrief = vi.fn();
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    getAlerts: (...a: unknown[]) => getAlerts(...a),
    getBrief: (...a: unknown[]) => getBrief(...a),
    errorMessage: actual.errorMessage,
  };
});

import { AlertsTable } from "@/components/alerts/AlertsTable";

// n alerts with ids first..first+n-1; prob = (50+i)% and amount = RM (i+1)*100, so higher id = higher prob.
function make(n: number, first = 100): Alert[] {
  return Array.from({ length: n }, (_, i) => ({
    txn_id: first + i,
    prob: (50 + i) / 100,
    amount_myr: (i + 1) * 100,
    channel: i % 2 ? "Mobile" : "ATM",
    merchant_cat: "Grocery",
    txn_ts: "2026-01-02T03:04:05",
  }));
}

const ids = () =>
  screen.getAllByRole("link", { name: /^#\d+$/ }).map((a) => a.textContent);

beforeEach(() => {
  getAlerts.mockReset();
  getBrief.mockReset();
});

it("loads every alert and lists them by probability, highest first", async () => {
  // Deliberately unsorted input.
  getAlerts.mockResolvedValue([make(3)[1], make(3)[0], make(3)[2]]);
  render(<AlertsTable />);
  await screen.findByText("#102");
  expect(getAlerts).toHaveBeenCalledWith();
  expect(ids()).toEqual(["#102", "#101", "#100"]);
  expect(screen.getByRole("link", { name: "#102" })).toHaveAttribute("href", "/alerts/102");
  expect(screen.getByText("52%")).toBeInTheDocument();
  expect(screen.getByText("RM 300.00")).toBeInTheDocument();
  expect(screen.getAllByText("Grocery").length).toBe(3);
  expect(screen.getAllByText(/computed in teradata/i).length).toBeGreaterThan(0);
});

it("paginates 10 per page with Previous/Next and shows the range", async () => {
  getAlerts.mockResolvedValue(make(25));
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("Showing 1-10 of 25");
  expect(ids()[0]).toBe("#124");
  expect(ids()).toHaveLength(10);
  expect(screen.getByRole("link", { name: "Go to previous page" })).toHaveAttribute("aria-disabled", "true");

  await user.click(screen.getByRole("link", { name: "Go to next page" }));
  expect(screen.getByText("Showing 11-20 of 25")).toBeInTheDocument();
  expect(ids()[0]).toBe("#114");

  await user.click(screen.getByRole("link", { name: "Go to page 3" }));
  expect(screen.getByText("Showing 21-25 of 25")).toBeInTheDocument();
  expect(ids()).toEqual(["#104", "#103", "#102", "#101", "#100"]);
  expect(screen.getByRole("link", { name: "Go to next page" })).toHaveAttribute("aria-disabled", "true");

  await user.click(screen.getByRole("link", { name: "Go to previous page" }));
  expect(screen.getByText("Showing 11-20 of 25")).toBeInTheDocument();
});

it("windows page numbers with ellipses for long queues", async () => {
  getAlerts.mockResolvedValue(make(100));
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("Showing 1-10 of 100");
  const pages = () =>
    within(screen.getByRole("navigation", { name: "pagination" }))
      .getAllByRole("link", { name: /^Go to page/ })
      .map((a) => a.textContent);
  expect(pages()).toEqual(["1", "2", "10"]);
  expect(screen.getAllByText("More pages")).toHaveLength(1);
  for (let i = 0; i < 4; i++) await user.click(screen.getByRole("link", { name: "Go to next page" }));
  expect(pages()).toEqual(["1", "4", "5", "6", "10"]);
  expect(screen.getAllByText("More pages")).toHaveLength(2);
});

// Radix sliders are driven by keyboard in jsdom: Arrow = 1 step, PageUp/PageDown = 10 steps.
// (Home/End always move the first/last handle, whichever one is focused, so they are not used here.)
// The spans are fixed: probability 0-100% in 1-point steps; amount RM 0-5,000 in RM 10 steps
// (so one PageUp/PageDown moves RM 100).
async function press(user: ReturnType<typeof userEvent.setup>, thumb: string, key: string, times = 1) {
  const handle = screen.getByRole("slider", { name: thumb });
  handle.focus();
  for (let i = 0; i < times; i++) await user.keyboard(key);
}

it("starts with the full fixed spans: 0%-100% and RM 0-RM 5,000", async () => {
  getAlerts.mockResolvedValue(make(25));
  render(<AlertsTable />);
  await screen.findByText("Showing 1-10 of 25");
  expect(screen.getByRole("slider", { name: "Minimum probability" })).toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByRole("slider", { name: "Maximum probability" })).toHaveAttribute("aria-valuenow", "100");
  expect(screen.getByRole("slider", { name: "Minimum amount" })).toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByRole("slider", { name: "Maximum amount" })).toHaveAttribute("aria-valuenow", "5000");
  expect(screen.getByText("0% - 100%")).toBeInTheDocument();
  expect(screen.getByText("RM 0 - RM 5,000")).toBeInTheDocument();
  expect(screen.getByText("25 of 25 alerts match")).toBeInTheDocument();
});

it("filters by a probability range with two slider handles and resets to the first page", async () => {
  getAlerts.mockResolvedValue(make(25)); // probabilities 50%..74%
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("Showing 1-10 of 25");
  await user.click(screen.getByRole("link", { name: "Go to next page" }));
  await press(user, "Maximum probability", "{PageDown}", 3); // 100 -> 70
  expect(screen.getByText("0% - 70%")).toBeInTheDocument();
  expect(screen.getByText("21 of 25 alerts match")).toBeInTheDocument();
  expect(screen.getByText("Showing 1-10 of 21")).toBeInTheDocument();
  expect(ids()[0]).toBe("#120");

  await press(user, "Minimum probability", "{PageUp}", 6); // 0 -> 60
  expect(screen.getByText("60% - 70%")).toBeInTheDocument();
  expect(screen.getByText("11 of 25 alerts match")).toBeInTheDocument();
  expect(screen.getByText("Showing 1-10 of 11")).toBeInTheDocument();
});

it("filters by an amount range", async () => {
  getAlerts.mockResolvedValue(make(25)); // RM 100..2,500
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("Showing 1-10 of 25");
  await press(user, "Maximum amount", "{PageDown}", 30); // 5,000 -> 2,000
  expect(screen.getByText("RM 0 - RM 2,000")).toBeInTheDocument();
  expect(screen.getByText("20 of 25 alerts match")).toBeInTheDocument();
  expect(ids()[0]).toBe("#119");
  await press(user, "Minimum amount", "{PageUp}", 4); // 0 -> 400
  expect(screen.getByText("RM 400 - RM 2,000")).toBeInTheDocument();
  expect(screen.getByText("17 of 25 alerts match")).toBeInTheDocument();
});

it("combines the probability and amount ranges", async () => {
  getAlerts.mockResolvedValue(make(25));
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("Showing 1-10 of 25");
  await press(user, "Minimum probability", "{PageUp}", 6); // >= 60%  -> ids 110..124
  await press(user, "Maximum amount", "{PageDown}", 30); // <= RM 2,000 -> ids 100..119
  expect(screen.getByText("10 of 25 alerts match")).toBeInTheDocument();
  expect(ids()).toEqual(["#119", "#118", "#117", "#116", "#115", "#114", "#113", "#112", "#111", "#110"]);
});

it("keeps alerts above RM 5,000 visible until a range is narrowed", async () => {
  getAlerts.mockResolvedValue([...make(2), { ...make(1, 900)[0], prob: 0.99, amount_myr: 7500 }]);
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("#900");
  expect(screen.getByText("3 of 3 alerts match")).toBeInTheDocument(); // full span = no filter
  await press(user, "Maximum amount", "{ArrowLeft}"); // 5,000 -> 4,990 applies the range
  expect(screen.getByText("2 of 3 alerts match")).toBeInTheDocument();
  expect(screen.queryByText("#900")).not.toBeInTheDocument();
});

it("Reset filters puts both ranges back to the full span", async () => {
  getAlerts.mockResolvedValue(make(25));
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("Showing 1-10 of 25");
  expect(screen.queryByRole("button", { name: "Reset filters" })).not.toBeInTheDocument();
  await press(user, "Maximum probability", "{PageDown}", 3);
  expect(screen.getByText("21 of 25 alerts match")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByText("25 of 25 alerts match")).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "Maximum probability" })).toHaveAttribute("aria-valuenow", "100");
  expect(screen.queryByRole("button", { name: "Reset filters" })).not.toBeInTheDocument();
});

it("shows an empty state when the ranges exclude everything", async () => {
  getAlerts.mockResolvedValue(make(25));
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("Showing 1-10 of 25");
  await press(user, "Minimum amount", "{PageUp}", 30); // >= RM 3,000, but the largest alert is RM 2,500
  expect(screen.getByText("0 of 25 alerts match")).toBeInTheDocument();
  expect(screen.getByText(/no alerts match/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to next page" })).toHaveAttribute("aria-disabled", "true");
});

it("shows a loading skeleton, then an API error with a working Retry", async () => {
  getAlerts.mockRejectedValueOnce(new Error("503 backend down")).mockResolvedValueOnce(make(2));
  const user = userEvent.setup();
  render(<AlertsTable />);
  expect(screen.getByRole("status", { name: /loading alerts/i })).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("API error: 503 backend down");
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("#101")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(getAlerts).toHaveBeenCalledTimes(2);
});

it("turns each row's probability into a button that opens the copilot brief for that alert", async () => {
  getAlerts.mockResolvedValue(make(3));
  getBrief.mockResolvedValue({
    txn_id: 101, prob: 0.51, priority: null, headline: "Review within the standard queue",
    items: [{ question: "Why was this flagged?", answer: "Because.", citations: [] }], retrieval_ms: 10, llm_ms: 1.2,
  });
  const user = userEvent.setup();
  render(<AlertsTable />);
  await screen.findByText("#102");
  expect(screen.getAllByRole("button", { name: /^Open copilot brief for #/ })).toHaveLength(3);
  const button = screen.getByRole("button", { name: "Open copilot brief for #101" });
  expect(button).toHaveAttribute("title", "Open copilot brief");
  expect(button).toHaveTextContent("51%");

  await user.click(button);
  expect(await screen.findByRole("dialog", { name: "Alert #101" })).toBeInTheDocument();
  expect(getBrief).toHaveBeenCalledWith(101);
  expect(await screen.findByText("Review within the standard queue")).toBeInTheDocument();
});

it("marks each alert row with data-alert-id", async () => {
  getAlerts.mockResolvedValue(make(2));
  const { container } = render(<AlertsTable />);
  await screen.findByText("#101");
  const rows = Array.from(container.querySelectorAll("tr[data-alert-id]")).map((r) => r.getAttribute("data-alert-id"));
  expect(rows).toEqual(["101", "100"]);
});
