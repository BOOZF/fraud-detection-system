import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import type { ChatStep } from "@/lib/chat-types";

type Handlers = { onStep?: (s: ChatStep) => void; onAnswer?: (t: string) => void };
const streamChat = vi.fn();
vi.mock("@/lib/chat", () => ({ streamChat: (...a: unknown[]) => streamChat(...a) }));

import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatProvider } from "@/components/chat/ChatProvider";

const step = (id: string, label: string, status: "running" | "done", detail: string | null = null): ChatStep => ({ id, label, status, detail });

/** A stream the test drives by hand: returns the handlers and a way to finish or fail it. */
function controlled() {
  let handlers!: Handlers;
  let finish!: (v: unknown) => void;
  let fail!: (e: Error) => void;
  streamChat.mockImplementation((_t: unknown, _c: unknown, _a: unknown, h: Handlers) => {
    handlers = h;
    return new Promise((res, rej) => ((finish = res), (fail = rej)));
  });
  return { h: () => handlers, finish: (v: unknown) => finish(v), fail: (e: Error) => fail(e) };
}

const renderChat = () => render(<ChatProvider><ChatBubble /></ChatProvider>);
async function ask(user: ReturnType<typeof userEvent.setup>, text = "explain this alert") {
  await user.click(screen.getByRole("button", { name: "Open copilot chat" }));
  await user.type(screen.getByRole("textbox"), `${text}{Enter}`);
}

beforeEach(() => {
  streamChat.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

it("shows Thinking… with a collapsed panel as soon as the question is sent", async () => {
  controlled();
  const user = userEvent.setup();
  renderChat();
  await ask(user);
  expect(screen.getByText("Thinking…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /show thinking/i })).toHaveAttribute("aria-expanded", "false");
});

it("shows the latest step in the header while collapsed, and every step with its detail when expanded", async () => {
  const c = controlled();
  const user = userEvent.setup();
  renderChat();
  await ask(user);
  act(() => {
    c.h().onStep!(step("s1", "Checking the question is about fraud", "done"));
    c.h().onStep!(step("s2", "Searching the policies for “deadline”", "running"));
  });
  const toggle = screen.getByRole("button", { name: /show thinking/i });
  expect(within(toggle).getByText("Searching the policies for “deadline”")).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Thinking steps" })).not.toBeInTheDocument();

  await user.click(toggle);
  expect(screen.getByRole("button", { name: /hide thinking/i })).toHaveAttribute("aria-expanded", "true");
  const items = within(screen.getByRole("list", { name: "Thinking steps" })).getAllByRole("listitem");
  expect(items.map((li) => li.textContent)).toEqual(["Checking the question is about fraudDone", "Searching the policies for “deadline”In progress"]);

  act(() => c.h().onStep!(step("s2", "Searching the policies for “deadline”", "done", "3 passages: a.pdf p.1")));
  expect(screen.getByText("3 passages: a.pdf p.1")).toBeInTheDocument();
  expect(within(screen.getByRole("list", { name: "Thinking steps" })).getAllByRole("listitem")).toHaveLength(2); // updated, not duplicated
});

it("shows the answer as it is written, before the stream has finished", async () => {
  const c = controlled();
  const user = userEvent.setup();
  renderChat();
  await ask(user);
  act(() => c.h().onAnswer!("This P1 alert looks"));
  expect(screen.getByText("This P1 alert looks")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  act(() => c.h().onAnswer!("This P1 alert looks like card-not-present fraud."));
  expect(screen.getByText("This P1 alert looks like card-not-present fraud.")).toBeInTheDocument();
  expect(screen.queryByText("This P1 alert looks")).not.toBeInTheDocument(); // replaced, not appended twice
});

it("keeps the steps after the answer is complete, collapsed under 'How this was answered'", async () => {
  const c = controlled();
  const user = userEvent.setup();
  renderChat();
  await ask(user);
  act(() => {
    c.h().onStep!(step("s1", "Reading alert #38067", "done", "RM 1,028.23"));
    c.h().onStep!(step("s2", "Writing the answer", "done"));
  });
  await act(async () => c.finish({ answer: "Final answer", citations: [], tools: [], guardrail: null }));
  expect(screen.getByText("Final answer")).toBeInTheDocument();
  expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
  const toggle = screen.getByRole("button", { name: /how this was answered/i });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  await user.click(toggle);
  expect(within(screen.getByRole("list", { name: "Thinking steps" })).getAllByRole("listitem")).toHaveLength(2);
});

it("a reply that arrives without any streamed steps has no thinking panel", async () => {
  streamChat.mockResolvedValue({ answer: "Quick answer", citations: [], tools: [], guardrail: null });
  const user = userEvent.setup();
  renderChat();
  await ask(user);
  expect(await screen.findByText("Quick answer")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /how this was answered|show thinking/i })).not.toBeInTheDocument();
});

it("drops the half-written answer on an error and offers Retry", async () => {
  const c = controlled();
  const user = userEvent.setup();
  renderChat();
  await ask(user);
  act(() => c.h().onAnswer!("Half an answ"));
  await act(async () => c.fail(new Error("Copilot unavailable: network down")));
  expect(screen.queryByText("Half an answ")).not.toBeInTheDocument();
  expect(await screen.findByText(/network down/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

it("New chat while an answer is streaming ignores what arrives afterwards", async () => {
  const c = controlled();
  const user = userEvent.setup();
  renderChat();
  await ask(user);
  await user.click(screen.getByRole("button", { name: "New chat" }));
  act(() => c.h().onAnswer!("late text"));
  await act(async () => c.finish({ answer: "late final", citations: [], tools: [], guardrail: null }));
  expect(screen.queryByText("late text")).not.toBeInTheDocument();
  expect(screen.queryByText("late final")).not.toBeInTheDocument();
});
