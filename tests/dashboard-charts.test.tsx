import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChannelBars } from "@/components/dashboard/ChannelBars";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import type { DailyRow } from "@/lib/overview";
import { Wallet } from "lucide-react";

// 10 consecutive days: ATM fraud = day number, FPX fraud = 1 every day. Total fraud on day n is n + 1.
const ROWS: DailyRow[] = Array.from({ length: 10 }, (_, i) => i + 1).flatMap((n) => {
  const date = `2026-07-${String(n).padStart(2, "0")}`;
  return [
    { date, channel: "ATM", txn: 100, fraud: n, alerts: n % 2, amount: 1000 },
    { date, channel: "FPX", txn: 50, fraud: 1, alerts: 0, amount: 500 },
  ];
});



describe("TrendChart", () => {
  it("shows the total for the chosen range and metric, and the title says what it is", () => {
    render(<TrendChart rows={ROWS} channel={null} />);
    expect(screen.getByRole("heading", { name: "Fraud over time" })).toBeInTheDocument();
    // default range is the last 30 days = all 10 days: fraud = (1+...+10) + 10 = 65
    expect(screen.getByTestId("trend-total")).toHaveTextContent("65");
  });

  it("changes the range from a select and recomputes the total", async () => {
    const user = userEvent.setup();
    render(<TrendChart rows={ROWS} channel={null} />);
    await user.selectOptions(screen.getByLabelText("Time range"), "7");
    // last 7 days = days 4..10: sum(4..10) = 49, plus 7 FPX = 56
    expect(screen.getByTestId("trend-total")).toHaveTextContent("56");
  });

  it("switches metric", async () => {
    const user = userEvent.setup();
    render(<TrendChart rows={ROWS} channel={null} />);
    await user.click(screen.getByRole("button", { name: "Transactions" }));
    expect(screen.getByRole("heading", { name: "Transactions over time" })).toBeInTheDocument();
    expect(screen.getByTestId("trend-total")).toHaveTextContent("1,500"); // 10 days x (100 + 50)
    expect(screen.getByRole("button", { name: "Transactions" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Fraud" })).toHaveAttribute("aria-pressed", "false");
  });

  it("filters to one channel and says so", () => {
    render(<TrendChart rows={ROWS} channel="ATM" />);
    expect(screen.getByTestId("trend-total")).toHaveTextContent("55"); // 1+...+10
    expect(screen.getByText("ATM")).toBeInTheDocument();
  });

  it("shows a tooltip with the value and the change against the day before when a day is hovered", async () => {
    const user = userEvent.setup();
    render(<TrendChart rows={ROWS} channel={null} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.hover(screen.getByLabelText("2026-07-10: 11"));
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("10 Jul 2026");
    expect(tip).toHaveTextContent("11");
    expect(tip).toHaveTextContent("+10%"); // day 9 had 10, day 10 has 11
    await user.unhover(screen.getByLabelText("2026-07-10: 11"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("toggles between a line and a bar chart", async () => {
    const user = userEvent.setup();
    render(<TrendChart rows={ROWS} channel={null} />);
    expect(screen.getByRole("button", { name: "Line chart" })).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector("path[data-series]")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Bar chart" }));
    expect(document.querySelector("path[data-series]")).toBeNull();
    expect(document.querySelectorAll("rect[data-bar]")).toHaveLength(30);
  });

  it("keeps the last date label inside the chart instead of cutting it off at the edge", () => {
    render(<TrendChart rows={ROWS} channel={null} />);
    const labels = [...document.querySelectorAll("svg text")].filter((t) => /^\d{1,2} \w{3}$/.test(t.textContent ?? ""));
    expect(labels.at(-1)).toHaveAttribute("text-anchor", "end");
    expect(labels[0]).toHaveAttribute("text-anchor", "middle");
  });

  it("says so when there is no data", () => {
    render(<TrendChart rows={[]} channel={null} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});

const CHANNELS = [
  { channel: "CARD_ECOM", txn: 50040, fraud: 1471 },
  { channel: "ATM", txn: 16124, fraud: 149 },
];

it("lists channels with fraud / transactions, the longest bar first, and reports a click on a channel", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<ChannelBars data={CHANNELS} selected={null} onSelect={onSelect} />);
  expect(screen.getByText("1,471 fraud / 50,040 txn")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /ATM/ }));
  expect(onSelect).toHaveBeenCalledWith("ATM");
});

it("marks the selected channel, and clicking it again clears the selection", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<ChannelBars data={CHANNELS} selected="ATM" onSelect={onSelect} />);
  expect(screen.getByRole("button", { name: /ATM/ })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /CARD_ECOM/ })).toHaveAttribute("aria-pressed", "false");
  await user.click(screen.getByRole("button", { name: /ATM/ }));
  expect(onSelect).toHaveBeenCalledWith(null);
});

it("switches the bars from fraud count to fraud rate", async () => {
  const user = userEvent.setup();
  render(<ChannelBars data={CHANNELS} selected={null} onSelect={() => {}} />);
  await user.click(screen.getByRole("button", { name: "Fraud rate" }));
  expect(screen.getByText("2.94%")).toBeInTheDocument(); // 1471 / 50040
  expect(screen.getByText("0.92%")).toBeInTheDocument(); // 149 / 16124
  // by rate ATM (0.92%) is shorter than CARD_ECOM (2.94%), whose bar is full width
  const bars = screen.getAllByRole("progressbar");
  expect(bars[0]).toHaveAttribute("aria-valuenow", "100");
});

it("shows a KPI with its change against the previous period, coloured by whether the change is good", () => {
  const { rerender } = render(<KpiCard label="Fraud transactions" value="1,234" icon={Wallet} change={0.123} upIsGood={false} periodLabel="vs previous 30 days" />);
  const delta = screen.getByTestId("kpi-delta");
  expect(delta).toHaveTextContent("+12.3%");
  expect(delta).toHaveTextContent("vs previous 30 days");
  expect(delta).toHaveAttribute("data-tone", "bad"); // more fraud is bad
  rerender(<KpiCard label="Transactions" value="1" icon={Wallet} change={0.05} upIsGood periodLabel="vs previous 30 days" />);
  expect(screen.getByTestId("kpi-delta")).toHaveAttribute("data-tone", "good");
  rerender(<KpiCard label="Transactions" value="1" icon={Wallet} change={-0.2} upIsGood periodLabel="x" />);
  expect(screen.getByTestId("kpi-delta")).toHaveTextContent("-20.0%");
  expect(screen.getByTestId("kpi-delta")).toHaveAttribute("data-tone", "bad");
  rerender(<KpiCard label="Transactions" value="1" icon={Wallet} change={null} upIsGood periodLabel="x" />);
  expect(screen.queryByTestId("kpi-delta")).not.toBeInTheDocument();
  expect(within(screen.getByRole("group", { name: "Transactions" })).getByText("1")).toBeInTheDocument();
});
