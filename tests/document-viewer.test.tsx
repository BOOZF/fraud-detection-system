import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { DocumentViewer } from "@/components/viewer/DocumentViewer";
import { documentUrl } from "@/lib/document-url";

it("builds the file URL with the page anchor and encodes the name", () => {
  expect(documentUrl("Fraud_Detection_SOP.pdf", 12)).toBe("/api/documents/Fraud_Detection_SOP.pdf/file#page=12");
  expect(documentUrl("My Policy (v2).pdf", 3)).toBe("/api/documents/My%20Policy%20(v2).pdf/file#page=3");
  expect(documentUrl("notes.md")).toBe("/api/documents/notes.md/file");
  expect(documentUrl("a.pdf", null)).toBe("/api/documents/a.pdf/file");
});

const pdf = { doc: "Fraud_Detection_SOP.pdf", section: "p.12", page: 12, text: "Excerpt from page twelve." };

it("shows a PDF citation as the PDF itself, opened at the cited page", () => {
  render(<DocumentViewer target={pdf} />);
  const frame = screen.getByTitle("Fraud_Detection_SOP.pdf, page 12");
  expect(frame).toHaveAttribute("src", "/api/documents/Fraud_Detection_SOP.pdf/file#page=12");
  expect(screen.getByText("Page 12")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /open in new tab/i })).toHaveAttribute(
    "href",
    "/api/documents/Fraud_Detection_SOP.pdf/file#page=12",
  );
});

it("moves to another page when a different citation is shown", () => {
  const { rerender } = render(<DocumentViewer target={pdf} />);
  rerender(<DocumentViewer target={{ ...pdf, section: "pp.54-55", page: 54 }} />);
  expect(screen.getByTitle("Fraud_Detection_SOP.pdf, page 54")).toHaveAttribute(
    "src",
    "/api/documents/Fraud_Detection_SOP.pdf/file#page=54",
  );
  expect(screen.queryByTitle("Fraud_Detection_SOP.pdf, page 12")).not.toBeInTheDocument();
});

it("shows the cited excerpt for documents that have no pages", () => {
  render(
    <DocumentViewer
      target={{ doc: "Fraud_Operations_SOP.md", section: "4.1", page: null, text: "Priority 1 alerts within 15 minutes." }}
    />,
  );
  expect(screen.queryByTitle(/page/i)).not.toBeInTheDocument();
  expect(screen.getByText("Section 4.1")).toBeInTheDocument();
  expect(screen.getByText("Priority 1 alerts within 15 minutes.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /open in new tab/i })).toHaveAttribute(
    "href",
    "/api/documents/Fraud_Operations_SOP.md/file",
  );
});

it("calls onClose from the close button, which only exists when a handler is given", async () => {
  const onClose = vi.fn();
  const { rerender } = render(<DocumentViewer target={pdf} onClose={onClose} />);
  await userEvent.setup().click(screen.getByRole("button", { name: /close viewer/i }));
  expect(onClose).toHaveBeenCalledTimes(1);
  rerender(<DocumentViewer target={pdf} />);
  expect(screen.queryByRole("button", { name: /close viewer/i })).not.toBeInTheDocument();
});
