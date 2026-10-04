import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import type { Brief } from "@/lib/types";

const getBrief = vi.fn();
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { getBrief: (...a: unknown[]) => getBrief(...a), errorMessage: actual.errorMessage };
});

import { AlertBriefDialog } from "@/components/brief/AlertBriefDialog";

const QUESTIONS = [
  "Why was this flagged?",
  "What does the SOP require me to do next?",
  "How fast must we act?",
  "Should we report this to the regulator?",
  "What should we tell the customer?",
];

function brief(txn_id: number): Brief {
  return {
    txn_id,
    prob: 0.93,
    priority: "P1",
    headline: "Freeze the card and call the customer now",
    retrieval_ms: 412,
    llm_ms: 12.5,
    items: QUESTIONS.map((question, i) => ({
      question,
      answer: `Answer number ${i + 1}`,
      citations:
        i === 0
          ? [
              { doc: "Fraud_Detection_SOP.pdf", chunk_id: 1, section: "p.12", page: 12, text: "pdf excerpt a" },
              { doc: "Fraud_Detection_SOP.pdf", chunk_id: 2, section: "p.54", page: 54, text: "pdf excerpt b" },
            ]
          : i === 1
            ? [{ doc: "Fraud_Operations_SOP.md", chunk_id: 3, section: "4.1", page: null, text: "Act within 15 minutes of the alert." }]
            : [],
    })),
  };
}

const open = (txnId: number) =>
  render(<AlertBriefDialog txnId={txnId} prob={0.93} open onOpenChange={() => {}} />);

beforeEach(() => getBrief.mockReset());

it("shows progress while loading, then the headline, five questions in order, answers and timing", async () => {
  getBrief.mockResolvedValue(brief(201));
  open(201);
  expect(screen.getByText(/retrieving policies from teradata/i)).toBeInTheDocument();
  expect(await screen.findByText("Freeze the card and call the customer now")).toBeInTheDocument();
  expect(getBrief).toHaveBeenCalledWith(201);
  expect(screen.getByRole("dialog", { name: "Alert #201" })).toBeInTheDocument();
  expect(screen.getByText("P1")).toBeInTheDocument();
  expect(screen.getByText("93%")).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(QUESTIONS);
  expect(screen.getByText("Answer number 1")).toBeInTheDocument();
  expect(screen.getByText("Answer number 5")).toBeInTheDocument();
  expect(screen.getByText("Retrieval 412 ms | LLM 12.5 s")).toBeInTheDocument();
  expect(screen.getAllByText(/computed in teradata/i).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Fraud_Detection_SOP.pdf · p.12" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Fraud_Operations_SOP.md · 4.1" })).toBeInTheDocument();
});

it("has no text input", async () => {
  getBrief.mockResolvedValue(brief(202));
  open(202);
  await screen.findByText("Answer number 1");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

it("opens a PDF citation at its page beside the answers, and switches page on another chip", async () => {
  getBrief.mockResolvedValue(brief(203));
  const user = userEvent.setup();
  open(203);
  const chipA = await screen.findByRole("button", { name: "Fraud_Detection_SOP.pdf · p.12" });
  expect(document.querySelector("iframe")).toBeNull();

  await user.click(chipA);
  expect(document.querySelector("iframe")).toHaveAttribute("src", "/api/documents/Fraud_Detection_SOP.pdf/file#page=12");
  expect(chipA).toHaveAttribute("aria-pressed", "true");

  const chipB = screen.getByRole("button", { name: "Fraud_Detection_SOP.pdf · p.54" });
  await user.click(chipB);
  expect(document.querySelector("iframe")).toHaveAttribute("src", "/api/documents/Fraud_Detection_SOP.pdf/file#page=54");
  expect(chipB).toHaveAttribute("aria-pressed", "true");
  expect(chipA).toHaveAttribute("aria-pressed", "false");
});

it("shows the excerpt for a markdown citation, and closing the viewer removes it", async () => {
  getBrief.mockResolvedValue(brief(204));
  const user = userEvent.setup();
  open(204);
  await user.click(await screen.findByRole("button", { name: "Fraud_Operations_SOP.md · 4.1" }));
  const viewer = screen.getByRole("region", { name: "Viewing Fraud_Operations_SOP.md" });
  expect(within(viewer).getByText("Act within 15 minutes of the alert.")).toBeInTheDocument();
  expect(document.querySelector("iframe")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Close viewer" }));
  expect(screen.queryByRole("region", { name: /Viewing/ })).not.toBeInTheDocument();
});

it("shows the error with a Retry that refetches, bypassing the cache", async () => {
  getBrief.mockRejectedValueOnce(new Error('502 {"detail":"LLM is unavailable"}')).mockResolvedValueOnce(brief(205));
  const user = userEvent.setup();
  open(205);
  expect(await screen.findByRole("alert")).toHaveTextContent("LLM is unavailable");
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Freeze the card and call the customer now")).toBeInTheDocument();
  expect(getBrief).toHaveBeenCalledTimes(2);
});

it("reopening the same alert uses the cache without calling the API again", async () => {
  getBrief.mockResolvedValue(brief(206));
  const first = open(206);
  await screen.findByText("Answer number 1");
  first.unmount();
  open(206);
  expect(await screen.findByText("Answer number 1")).toBeInTheDocument();
  expect(getBrief).toHaveBeenCalledTimes(1);
});

it("marks the dialog content with the alert it is about", async () => {
  getBrief.mockResolvedValue(brief(204));
  open(204);
  const dialog = await screen.findByRole("dialog", { name: "Alert #204" });
  expect(dialog.getAttribute("data-alert-id")).toBe("204");
});
