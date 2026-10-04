import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
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
