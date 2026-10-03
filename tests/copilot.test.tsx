import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const askCopilot = vi.fn();
vi.mock("@/lib/api", () => ({ askCopilot: (...a: unknown[]) => askCopilot(...a) }));

import { CopilotChat } from "@/components/CopilotChat";

it("sends a suggested question and renders answer, citations and latency chips", async () => {
  askCopilot.mockResolvedValue({
    answer: "Flagged because of a new device and foreign merchant.",
    citations: [{ doc: "XX-SOP-FRAUD-04", chunk_id: 12, text: "Freeze the card within 15 minutes." }],
    retrieval_ms: 42,
    llm_ms: 1800,
  });
  const user = userEvent.setup();
  render(<CopilotChat txnId={1001} />);

  await user.click(screen.getByRole("button", { name: "What does the SOP require me to do next?" }));

  expect(askCopilot).toHaveBeenCalledWith(1001, "What does the SOP require me to do next?");
  expect(await screen.findByText("Flagged because of a new device and foreign merchant.")).toBeInTheDocument();
  expect(screen.getByText(/XX-SOP-FRAUD-04/)).toBeInTheDocument();
  expect(screen.getByText("Freeze the card within 15 minutes.")).toBeInTheDocument();
  expect(screen.getByText("retrieval 42 ms | LLM 1.8 s")).toBeInTheDocument();
});

it("offers all three suggested questions and a free-text box", async () => {
  askCopilot.mockResolvedValue({ answer: "ok", citations: [], retrieval_ms: 1, llm_ms: 100 });
  const user = userEvent.setup();
  render(<CopilotChat txnId={5} />);
  expect(screen.getByRole("button", { name: "Why was this flagged?" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Should we report this to the regulator?" })).toBeInTheDocument();
  await user.type(screen.getByRole("textbox"), "Custom question{Enter}");
  expect(askCopilot).toHaveBeenCalledWith(5, "Custom question");
});

it("shows an error when the copilot fails", async () => {
  askCopilot.mockRejectedValue(new Error("500 boom"));
  const user = userEvent.setup();
  render(<CopilotChat txnId={5} />);
  await user.click(screen.getByRole("button", { name: "Why was this flagged?" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("500 boom");
});
