import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { Markdown } from "@/components/chat/Markdown";

const TABLE = `Here are the counts of alerts by channel:

| Channel | Alerts | Total (RM) |
|---|---:|---:|
| CARD_ECOM | 114 | 45,264.50 |
| DUITNOW | 61 | 19,396.57 |

CARD_ECOM has the most alerts.`;

it("renders a markdown table as a real table with headers, rows and numeric alignment", () => {
  render(<Markdown text={TABLE} />);
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Channel", "Alerts", "Total (RM)"]);
  const rows = within(table).getAllByRole("row");
  expect(rows).toHaveLength(3);
  expect(within(rows[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["CARD_ECOM", "114", "45,264.50"]);
  expect(within(rows[1]).getAllByRole("cell")[1]).toHaveClass("text-right");
  expect(screen.getByText("Here are the counts of alerts by channel:")).toBeInTheDocument();
  expect(screen.getByText("CARD_ECOM has the most alerts.")).toBeInTheDocument();
});

it("keeps bold inside cells and never injects HTML", () => {
  render(<Markdown text={"| A | B |\n|---|---|\n| **bold** | <b>x</b> |"} />);
  expect(screen.getByText("bold").tagName).toBe("STRONG");
  expect(screen.getByText("<b>x</b>")).toBeInTheDocument();
});

it("leaves ordinary text with a pipe alone", () => {
  render(<Markdown text="Use a | b as a separator" />);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByText("Use a | b as a separator")).toBeInTheDocument();
});

it("shows a line that is only **bold** as a section label, so a structured answer reads as sections", () => {
  render(<Markdown text={"Summary sentence.\n\n**Key facts**\n- RM 1,028.23\n\n**Why it was flagged**\n- Foreign transaction."} />);
  const labels = screen.getAllByTestId("section-label");
  expect(labels.map((l) => l.textContent)).toEqual(["Key facts", "Why it was flagged"]);
  expect(screen.getByText("Summary sentence.")).not.toHaveAttribute("data-testid", "section-label");
});

it("does not treat bold inside a sentence as a section label", () => {
  render(<Markdown text="The **P1** alert is open." />);
  expect(screen.queryByTestId("section-label")).not.toBeInTheDocument();
});

const CITES = [
  { doc: "credit_card.pdf", chunk_id: 4, section: "p.44", page: 44, text: "t", focus: "f" },
  { doc: "debit_card.pdf", chunk_id: 9, section: "pp.58-59", page: 58, text: "t", focus: null },
];

it("turns a [document p.N] reference into a small clickable page chip when that source was retrieved", async () => {
  const onCite = vi.fn();
  render(<Markdown text={"- Issuers send alerts [credit_card.pdf p.44]\n- See also [debit_card.pdf p.59]."} citations={CITES} onCite={onCite} />);
  const chip = screen.getByRole("button", { name: "Open credit_card.pdf p.44" });
  expect(chip).toHaveTextContent("p.44");
  expect(screen.queryByText(/\[credit_card.pdf/)).not.toBeInTheDocument();
  await userEvent.setup().click(chip);
  expect(onCite).toHaveBeenCalledWith(CITES[0]);
  // a page inside a cited range matches the chunk that spans it
  expect(screen.getByRole("button", { name: "Open debit_card.pdf pp.58-59" })).toHaveTextContent("p.59");
});

it("leaves a reference as plain text when it does not match a retrieved source", () => {
  render(<Markdown text="Unknown [other.pdf p.3]" citations={CITES} onCite={() => {}} />);
  expect(screen.getByText("Unknown [other.pdf p.3]")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("renders references as text when no citations are given", () => {
  render(<Markdown text="Plain [credit_card.pdf p.44]" />);
  expect(screen.getByText("Plain [credit_card.pdf p.44]")).toBeInTheDocument();
});
