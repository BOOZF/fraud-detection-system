import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const streamChat = vi.fn();
vi.mock("@/lib/chat", () => ({ streamChat: (...a: unknown[]) => streamChat(...a) }));

import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatProvider } from "@/components/chat/ChatProvider";

const reply = (answer: string, extra: object = {}) => ({ answer, citations: [], tools: [], ...extra });
const renderChat = () =>
  render(
    <ChatProvider>
      <ChatBubble />
    </ChatProvider>,
  );
const open = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Open copilot chat" }));

beforeEach(() => {
  streamChat.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

it("is closed by default and opens from the floating button", async () => {
  const user = userEvent.setup();
  renderChat();
  expect(screen.queryByText("Fraud Copilot")).not.toBeInTheDocument();
  await open(user);
  expect(screen.getByText("Fraud Copilot")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "How many transactions need an alert now?" })).toBeInTheDocument();
});

it("sends a starter chip and shows the answer with minimal markdown", async () => {
  streamChat.mockResolvedValue(reply("The rate is **1.2%**\n- first\n- second"));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.click(screen.getByRole("button", { name: "How many transactions need an alert now?" }));

  expect(streamChat.mock.calls[0].slice(0, 3)).toEqual([[{ role: "user", content: "How many transactions need an alert now?" }], undefined, undefined]);
  expect(await screen.findByText("1.2%")).toContainHTML("<strong>1.2%</strong>");
  expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["first", "second"]);
  expect(screen.queryByRole("button", { name: "How many transactions need an alert now?" })).not.toBeInTheDocument();
});

it("does not inject HTML from the answer", async () => {
  streamChat.mockResolvedValue(reply("<img src=x alt=pwn> hello"));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "hi{Enter}");
  expect(await screen.findByText("<img src=x alt=pwn> hello")).toBeInTheDocument();
  expect(screen.queryByAltText("pwn")).not.toBeInTheDocument();
});

it("sends the whole history on the second question", async () => {
  streamChat.mockResolvedValueOnce(reply("A1")).mockResolvedValueOnce(reply("A2"));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "Q1{Enter}");
  await screen.findByText("A1");
  await user.type(screen.getByRole("textbox"), "Q2{Enter}");
  await screen.findByText("A2");
  expect(streamChat.mock.lastCall!.slice(0, 3)).toEqual([
    [
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1" },
      { role: "user", content: "Q2" },
    ],
    undefined,
    undefined,
  ]);
});

it("shows a thinking indicator and disables Send while waiting", async () => {
  let resolve!: (v: unknown) => void;
  streamChat.mockReturnValue(new Promise((r) => (resolve = r)));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "Q1{Enter}");
  expect(screen.getByText("Thinking…")).toBeInTheDocument();
  await user.type(screen.getByRole("textbox"), "Q2");
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  resolve(reply("done"));
  expect(await screen.findByText("done")).toBeInTheDocument();
  expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
});

it("shows the error detail and retries the last question", async () => {
  streamChat.mockRejectedValueOnce(new Error('502 {"detail":"LLM unavailable"}')).mockResolvedValueOnce(reply("recovered"));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "Q1{Enter}");
  expect(await screen.findByText("LLM unavailable")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("recovered")).toBeInTheDocument();
  expect(streamChat).toHaveBeenCalledTimes(2);
  expect(streamChat.mock.lastCall!.slice(0, 3)).toEqual([[{ role: "user", content: "Q1" }], undefined, undefined]);
  expect(screen.queryByText("LLM unavailable")).not.toBeInTheDocument();
});

it("cannot send empty or whitespace input; Shift+Enter adds a newline", async () => {
  const user = userEvent.setup();
  renderChat();
  await open(user);
  const send = screen.getByRole("button", { name: "Send" });
  expect(send).toBeDisabled();
  await user.type(screen.getByRole("textbox"), "   {Enter}");
  expect(streamChat).not.toHaveBeenCalled();
  await user.clear(screen.getByRole("textbox"));
  await user.type(screen.getByRole("textbox"), "a{Shift>}{Enter}{/Shift}b");
  expect(screen.getByRole("textbox")).toHaveValue("a\nb");
  expect(streamChat).not.toHaveBeenCalled();
});

it("keeps the conversation across close and reopen, and New chat clears it", async () => {
  streamChat.mockResolvedValue(reply("A1"));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "Q1{Enter}");
  await screen.findByText("A1");
  await user.click(screen.getByRole("button", { name: "Close chat" }));
  expect(screen.queryByText("A1")).not.toBeInTheDocument();
  await open(user);
  expect(screen.getByText("A1")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "New chat" }));
  expect(screen.queryByText("A1")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "How many transactions need an alert now?" })).toBeInTheDocument();
});

it("closes on Escape", async () => {
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.keyboard("{Escape}");
  expect(screen.queryByText("Fraud Copilot")).not.toBeInTheDocument();
});

it("opens a PDF citation in a viewer dialog at the cited page", async () => {
  streamChat.mockResolvedValue(
    reply("See SOP", {
      citations: [{ doc: "XX-SOP-FRAUD-04.pdf", chunk_id: 3, section: "p.7", page: 7, text: "Freeze the card." }],
    }),
  );
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "sop?{Enter}");
  await user.click(await screen.findByRole("button", { name: "XX-SOP-FRAUD-04.pdf · p.7" }));
  const dialog = await screen.findByRole("dialog", { name: /XX-SOP-FRAUD-04\.pdf/ });
  const frame = within(dialog).getByTitle("XX-SOP-FRAUD-04.pdf, page 7");
  expect(frame.getAttribute("src")).toMatch(/#page=7$/);
});

it("offers the five starter questions when the conversation is empty", async () => {
  const user = userEvent.setup();
  renderChat();
  await open(user);
  const names = screen
    .getAllByRole("button")
    .map((b) => b.textContent)
    .filter(Boolean);
  expect(names).toEqual([
    "How many transactions need an alert now?",
    "Break down the alerts by channel",
    "Which merchant categories have the most alerts?",
    "What is the total amount at risk in alerts?",
    "Summarize the key steps in the fraud policy",
  ]);
});

const SOURCE = {
  doc: "credit_card.pdf", chunk_id: 4, section: "p.44", page: 44,
  text: "Issuers keep a register. Issuer shall provide transaction alerts by SMS or in-app notification. Hours are set by the issuer.",
  focus: "Issuer shall provide transaction alerts by SMS or in-app notification.",
};

it("shows each source as a card with the cited paragraph and the key sentence highlighted", async () => {
  streamChat.mockResolvedValue(reply("**What the policy says**\n- Alerts go out by SMS [credit_card.pdf p.44]", { citations: [SOURCE] }));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "How are cardholders alerted?{Enter}");
  const card = await screen.findByRole("group", { name: "Source credit_card.pdf · p.44" });
  expect(within(card).getByText(/Issuers keep a register/)).toBeInTheDocument();
  const mark = within(card).getByText("Issuer shall provide transaction alerts by SMS or in-app notification.");
  expect(mark.tagName).toBe("MARK");
  expect(within(card).getByText(/Hours are set by the issuer/)).toBeInTheDocument();
});

it("opens the PDF with the paragraph and the key sentence highlighted from the card or from the inline page chip", async () => {
  streamChat.mockResolvedValue(reply("- Alerts go out by SMS [credit_card.pdf p.44]", { citations: [SOURCE] }));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "How are cardholders alerted?{Enter}");
  await user.click(await screen.findByRole("button", { name: "Open credit_card.pdf p.44" })); // the chip inside the answer
  const frame = await screen.findByTitle("credit_card.pdf, page 44");
  expect(frame.getAttribute("src")).toBe(
    "/api/documents/credit_card.pdf/file?chunk=4&quote=Issuer%20shall%20provide%20transaction%20alerts%20by%20SMS%20or%20in-app%20notification.#page=44",
  );
});

it("shows the start of the paragraph when the answer relies on no single sentence", async () => {
  streamChat.mockResolvedValue(reply("- Something [credit_card.pdf p.44]", { citations: [{ ...SOURCE, focus: null }] }));
  const user = userEvent.setup();
  renderChat();
  await open(user);
  await user.type(screen.getByRole("textbox"), "q{Enter}");
  const card = await screen.findByRole("group", { name: "Source credit_card.pdf · p.44" });
  expect(within(card).queryByText((_, el) => el?.tagName === "MARK")).not.toBeInTheDocument();
  expect(within(card).getByText(/Issuers keep a register/)).toBeInTheDocument();
});
