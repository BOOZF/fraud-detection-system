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

it("has no close button of its own, so a dialog around it never shows two", () => {
  render(<DocumentViewer target={pdf} />);
  expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
});

it("offers a clearly labelled Hide document button only when a handler is given", async () => {
  const onHide = vi.fn();
  const { rerender } = render(<DocumentViewer target={pdf} onHide={onHide} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Hide document" }));
  expect(onHide).toHaveBeenCalledTimes(1);
  rerender(<DocumentViewer target={pdf} />);
  expect(screen.queryByRole("button", { name: "Hide document" })).not.toBeInTheDocument();
});

it("asks the server to highlight the cited passage when the citation carries a chunk id", () => {
  expect(documentUrl("Fraud_Detection_SOP.pdf", 12, 7)).toBe("/api/documents/Fraud_Detection_SOP.pdf/file?chunk=7#page=12");
  render(<DocumentViewer target={{ ...pdf, chunkId: 7 }} />);
  expect(screen.getByTitle("Fraud_Detection_SOP.pdf, page 12")).toHaveAttribute(
    "src",
    "/api/documents/Fraud_Detection_SOP.pdf/file?chunk=7#page=12",
  );
});

it("opens a whole document (no citation) from its first page", () => {
  render(<DocumentViewer target={{ doc: "Fraud_Detection_SOP.pdf", section: "", page: null, text: "" }} />);
  expect(screen.getByTitle("Fraud_Detection_SOP.pdf")).toHaveAttribute("src", "/api/documents/Fraud_Detection_SOP.pdf/file");
});

it("asks for the key sentence to be highlighted too, URL-encoded and kept to a sensible length", () => {
  expect(documentUrl("a.pdf", 5, 7, "Issuer shall provide alerts, 100% of the time")).toBe(
    "/api/documents/a.pdf/file?chunk=7&quote=Issuer%20shall%20provide%20alerts%2C%20100%25%20of%20the%20time#page=5",
  );
  expect(documentUrl("a.pdf", 5, 7, "x".repeat(900)).length).toBeLessThan(600);
  expect(documentUrl("a.pdf", 5, null, "ignored without a chunk")).toBe("/api/documents/a.pdf/file#page=5");
  render(<DocumentViewer target={{ ...pdf, chunkId: 7, focus: "The key sentence." }} />);
  expect(screen.getByTitle("Fraud_Detection_SOP.pdf, page 12")).toHaveAttribute(
    "src",
    "/api/documents/Fraud_Detection_SOP.pdf/file?chunk=7&quote=The%20key%20sentence.#page=12",
  );
});
