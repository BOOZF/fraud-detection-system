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
    llm_ms: 3709,
    facts: { amount_myr: 1028.23, channel: "CARD_ECOM", merchant_cat: "TRAVEL", hour_of_day: 1, txn_ts: "2026-07-15 06:39:13" },
    indicators: ["Foreign transaction", "Amount 16.3x the 30-day average"],
    coverage: { covered: 4, total: 4 },
    items: QUESTIONS.map((question, i) => ({
      question,
      verdict: `Verdict number ${i + 1}`,
      points: [`First point ${i + 1}`, `Second point ${i + 1}`],
      answer: `First point ${i + 1} Second point ${i + 1}`,
      covered: true,
      evidence: i === 1 ? "Act within 15 minutes of the alert." : i === 0 ? null : `Evidence sentence ${i + 1}.`,
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
  expect(screen.getByText("Verdict number 1")).toBeInTheDocument();
  expect(screen.getByText("Verdict number 5")).toBeInTheDocument();
  expect(screen.getByText("First point 3")).toBeInTheDocument();
  expect(screen.getByText("Retrieval 412 ms | LLM 3.7 s")).toBeInTheDocument();
  expect(screen.getAllByText(/computed in teradata/i).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Fraud_Detection_SOP.pdf · p.12" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Fraud_Operations_SOP.md · 4.1" })).toBeInTheDocument();
});

it("has no text input", async () => {
  getBrief.mockResolvedValue(brief(202));
  open(202);
  await screen.findByText("Verdict number 1");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

it("opens a PDF citation at its page beside the answers, and switches page on another chip", async () => {
  getBrief.mockResolvedValue(brief(203));
  const user = userEvent.setup();
  open(203);
  const chipA = await screen.findByRole("button", { name: "Fraud_Detection_SOP.pdf · p.12" });
  expect(document.querySelector("iframe")).toBeNull();

  await user.click(chipA);
  expect(document.querySelector("iframe")).toHaveAttribute("src", "/api/documents/Fraud_Detection_SOP.pdf/file?chunk=1#page=12");
  expect(chipA).toHaveAttribute("aria-pressed", "true");

  const chipB = screen.getByRole("button", { name: "Fraud_Detection_SOP.pdf · p.54" });
  await user.click(chipB);
  expect(document.querySelector("iframe")).toHaveAttribute("src", "/api/documents/Fraud_Detection_SOP.pdf/file?chunk=2#page=54");
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

  await user.click(screen.getByRole("button", { name: "Hide document" }));
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
  await screen.findByText("Verdict number 1");
  first.unmount();
  open(206);
  expect(await screen.findByText("Verdict number 1")).toBeInTheDocument();
  expect(getBrief).toHaveBeenCalledTimes(1);
});

it("marks the dialog content with the alert it is about", async () => {
  getBrief.mockResolvedValue(brief(204));
  open(204);
  const dialog = await screen.findByRole("dialog", { name: "Alert #204" });
  expect(dialog.getAttribute("data-alert-id")).toBe("204");
});

it("leads with the transaction facts and the rule-based risk indicators, then the answers as bullet points", async () => {
  getBrief.mockResolvedValue(brief(207));
  open(207);
  await screen.findByText("Verdict number 1");
  const summary = screen.getByRole("region", { name: "Transaction summary" });
  expect(within(summary).getByText("RM 1,028.23")).toBeInTheDocument();
  expect(within(summary).getByText("CARD_ECOM")).toBeInTheDocument();
  expect(within(summary).getByText("Foreign transaction")).toBeInTheDocument();
  expect(within(summary).getByText("Amount 16.3x the 30-day average")).toBeInTheDocument();
  const first = screen.getByRole("heading", { level: 3, name: QUESTIONS[0] }).closest("section") as HTMLElement;
  expect(within(first).getAllByRole("listitem").map((li) => li.textContent).slice(0, 2)).toEqual(["First point 1", "Second point 1"]);
});

it("shows a single close control while a document is open beside the answers", async () => {
  getBrief.mockResolvedValue(brief(208));
  const user = userEvent.setup();
  open(208);
  await user.click(await screen.findByRole("button", { name: "Fraud_Detection_SOP.pdf · p.12" }));
  expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(1); // the dialog's own
  expect(screen.getByRole("button", { name: "Hide document" })).toBeInTheDocument();
});

it("shows the sentence from the policy that an answer rests on", async () => {
  getBrief.mockResolvedValue(brief(209));
  open(209);
  const second = (await screen.findByRole("heading", { level: 3, name: QUESTIONS[1] })).closest("section") as HTMLElement;
  expect(within(second).getByText(/Policy says/)).toBeInTheDocument();
  expect(within(second).getByText("“Act within 15 minutes of the alert.”")).toBeInTheDocument();
  const first = screen.getByRole("heading", { level: 3, name: QUESTIONS[0] }).closest("section") as HTMLElement;
  expect(within(first).queryByText(/Policy says/)).not.toBeInTheDocument(); // answered from the alert's own facts
});

it("marks an uncovered question as such, with no source chip, and explains the gap once with a way to fix it", async () => {
  const b = brief(210);
  b.coverage = { covered: 1, total: 4 };
  b.items = b.items.map((item, i) =>
    i >= 2 ? { ...item, verdict: "Not covered by policies", points: ["Not covered by the uploaded policies."], answer: "x", covered: false, evidence: null, citations: [] } : item,
  );
  getBrief.mockResolvedValue(b);
  open(210);
  const notice = await screen.findByRole("note");
  expect(notice).toHaveTextContent("The uploaded documents cover 1 of 4 policy questions");
  expect(within(notice).getByRole("link", { name: /documents page/i })).toHaveAttribute("href", "/documents");
  const card = screen.getByRole("heading", { level: 3, name: QUESTIONS[3] }).closest("section") as HTMLElement;
  expect(card).toHaveAttribute("data-covered", "false");
  expect(within(card).queryByRole("button")).not.toBeInTheDocument();
});

it("shows no coverage note when every policy question is covered", async () => {
  getBrief.mockResolvedValue(brief(211));
  open(211);
  await screen.findByText("Verdict number 1");
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
});

it("opens a citation with its evidence sentence highlighted in the PDF", async () => {
  const b = brief(212);
  b.items[0].citations = [{ doc: "Fraud_Detection_SOP.pdf", chunk_id: 7, section: "p.12", page: 12, text: "pdf excerpt a", focus: "Act within 15 minutes." }];
  getBrief.mockResolvedValue(b);
  const user = userEvent.setup();
  open(212);
  await user.click(await screen.findByRole("button", { name: "Fraud_Detection_SOP.pdf · p.12" }));
  expect(document.querySelector("iframe")).toHaveAttribute("src", "/api/documents/Fraud_Detection_SOP.pdf/file?chunk=7&quote=Act%20within%2015%20minutes.#page=12");
});
