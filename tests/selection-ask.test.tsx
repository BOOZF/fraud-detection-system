import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const sendChat = vi.fn();
vi.mock("@/lib/chat", () => ({ sendChat: (...a: unknown[]) => sendChat(...a) }));

import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { SelectionAsk } from "@/components/chat/SelectionAsk";

const TEXT = "Freeze the card within 15 minutes of confirmation.";

beforeEach(() => {
  sendChat.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
  const rect = { top: 200, bottom: 216, left: 100, right: 300, width: 200, height: 16, x: 100, y: 200, toJSON: () => ({}) };
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () => [rect] as unknown as DOMRectList;
  window.getSelection()?.removeAllRanges();
});

function renderApp() {
  return render(
    <ChatProvider>
      <p data-testid="para">{TEXT}</p>
      <table>
        <tbody>
          <tr data-alert-id="38067">
            <td data-testid="row-a">Card-not-present spend at electronics</td>
            <td data-testid="row-a2">Mobile channel at 3am</td>
          </tr>
          <tr data-alert-id="40112">
            <td data-testid="row-b">ATM withdrawal far from home</td>
          </tr>
        </tbody>
      </table>
      <div data-no-ask>
        <p data-testid="noask">Do not offer to ask about this text.</p>
      </div>
      <div contentEditable suppressContentEditableWarning>
        <p data-testid="editable">Editable text that is long enough.</p>
      </div>
      <ChatBubble />
      <SelectionAsk />
    </ChatProvider>,
  );
}

function select(node: Node, start = 0, end?: number) {
  const text = node.firstChild!;
  const range = document.createRange();
  range.setStart(text, start);
  range.setEnd(text, end ?? text.textContent!.length);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  act(() => {
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
}

function selectAcross(from: Node, to: Node) {
  const range = document.createRange();
  range.setStart(from.firstChild!, 0);
  range.setEnd(to.firstChild!, to.textContent!.length);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  act(() => {
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
}

const askButton = () => screen.queryByRole("button", { name: "Ask copilot" });

it("shows the Ask copilot button for a normal selection", () => {
  renderApp();
  expect(askButton()).not.toBeInTheDocument();
  select(screen.getByTestId("para"));
  expect(askButton()).toBeInTheDocument();
});

it("hides when the selection collapses, on Escape and on scroll", () => {
  renderApp();
  select(screen.getByTestId("para"));
  act(() => {
    window.getSelection()!.removeAllRanges();
    document.dispatchEvent(new Event("selectionchange"));
  });
  expect(askButton()).not.toBeInTheDocument();

  select(screen.getByTestId("para"));
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  expect(askButton()).not.toBeInTheDocument();

  select(screen.getByTestId("para"));
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
  expect(askButton()).not.toBeInTheDocument();
});

it("ignores selections shorter than 3 characters", () => {
  renderApp();
  select(screen.getByTestId("para"), 0, 2);
  expect(askButton()).not.toBeInTheDocument();
});

it("ignores selections longer than 1500 characters", () => {
  render(
    <ChatProvider>
      <p data-testid="long">{"word ".repeat(400)}</p>
      <SelectionAsk />
    </ChatProvider>,
  );
  select(screen.getByTestId("long"));
  expect(askButton()).not.toBeInTheDocument();
});

it("ignores selections inside data-no-ask and contenteditable elements", () => {
  renderApp();
  select(screen.getByTestId("noask"));
  expect(askButton()).not.toBeInTheDocument();
  select(screen.getByTestId("editable"));
  expect(askButton()).not.toBeInTheDocument();
});

it("ignores selections inside the chat panel and while an input has focus", async () => {
  sendChat.mockResolvedValue({ answer: "Answer text from the copilot", citations: [], tools: [] });
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole("button", { name: "Open copilot chat" }));
  await user.type(screen.getByRole("textbox", { name: "Message" }), "hello there{Enter}");
  select(await screen.findByText("Answer text from the copilot"));
  expect(askButton()).not.toBeInTheDocument();

  screen.getByRole("textbox", { name: "Message" }).focus();
  select(screen.getByTestId("para"));
  expect(askButton()).not.toBeInTheDocument();
});

it("attaches the selection as a context chip, focuses the input, and sends the exact text", async () => {
  sendChat.mockResolvedValue({ answer: "Because policy.", citations: [], tools: [] });
  const user = userEvent.setup();
  renderApp();
  select(screen.getByTestId("para"));
  await user.click(askButton()!);

  expect(screen.getByText(`Selected text: “${TEXT}”`)).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "Message" });
  expect(input).toHaveFocus();
  expect(window.getSelection()!.toString()).toBe("");
  expect(askButton()).not.toBeInTheDocument();
  expect(sendChat).not.toHaveBeenCalled();

  await user.type(input, "Why 15 minutes?{Enter}");
  expect(sendChat).toHaveBeenCalledWith([{ role: "user", content: "Why 15 minutes?" }], TEXT, undefined);
  expect(screen.queryByText(`Selected text: “${TEXT}”`)).not.toBeInTheDocument();
  expect(await screen.findByText("Because policy.")).toBeInTheDocument();
  expect(screen.getByText(`“${TEXT}”`)).toBeInTheDocument();
});

it("removes the context chip with its x button", async () => {
  const user = userEvent.setup();
  renderApp();
  select(screen.getByTestId("para"));
  await user.click(askButton()!);
  await user.click(screen.getByRole("button", { name: "Remove selected text" }));
  expect(screen.queryByText(/Selected text:/)).not.toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "hi{Enter}");
  expect(sendChat).toHaveBeenCalledWith([{ role: "user", content: "hi" }], undefined, undefined);
});

const ROW_A = "Card-not-present spend at electronics";

it("attaches the alert id of the row the selection lies in, sends it with the exact context and shows it in the message", async () => {
  sendChat.mockResolvedValue({ answer: "It looks risky.", citations: [], tools: [] });
  const user = userEvent.setup();
  renderApp();
  select(screen.getByTestId("row-a"));
  await user.click(askButton()!);

  expect(screen.getByText("Alert #38067")).toBeInTheDocument();
  expect(screen.getByText(`Selected text: “${ROW_A}”`)).toBeInTheDocument();

  await user.type(screen.getByRole("textbox", { name: "Message" }), "Why flagged?{Enter}");
  expect(sendChat).toHaveBeenCalledWith([{ role: "user", content: "Why flagged?" }], ROW_A, 38067);
  expect(screen.queryByText("Alert #38067")).not.toBeInTheDocument();
  expect(screen.getByText("About alert #38067")).toBeInTheDocument();
  expect(screen.getByText(`“${ROW_A}”`)).toBeInTheDocument();

  await user.type(screen.getByRole("textbox", { name: "Message" }), "And now?{Enter}");
  expect(sendChat).toHaveBeenLastCalledWith(expect.any(Array), undefined, undefined);
});

it("attaches the alert id when the selection spans two cells of the same row", async () => {
  const user = userEvent.setup();
  renderApp();
  selectAcross(screen.getByTestId("row-a"), screen.getByTestId("row-a2"));
  await user.click(askButton()!);
  expect(screen.getByText("Alert #38067")).toBeInTheDocument();
});

it("attaches no alert id when the selection spans two alerts", async () => {
  const user = userEvent.setup();
  renderApp();
  selectAcross(screen.getByTestId("row-a"), screen.getByTestId("row-b"));
  await user.click(askButton()!);
  expect(screen.getByText(/Selected text:/)).toBeInTheDocument();
  expect(screen.queryByText(/Alert #/)).not.toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Compare{Enter}");
  expect(sendChat.mock.calls[0][2]).toBeUndefined();
  expect(screen.queryByText(/About alert/)).not.toBeInTheDocument();
});

it("attaches no alert id for a selection outside any alert", async () => {
  const user = userEvent.setup();
  renderApp();
  select(screen.getByTestId("para"));
  await user.click(askButton()!);
  expect(screen.queryByText(/Alert #/)).not.toBeInTheDocument();
});

it("removes the alert id together with the text when the chip is cleared", async () => {
  const user = userEvent.setup();
  renderApp();
  select(screen.getByTestId("row-a"));
  await user.click(askButton()!);
  await user.click(screen.getByRole("button", { name: "Remove selected text" }));
  expect(screen.queryByText("Alert #38067")).not.toBeInTheDocument();
  expect(screen.queryByText(/Selected text:/)).not.toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "hi{Enter}");
  expect(sendChat).toHaveBeenCalledWith([{ role: "user", content: "hi" }], undefined, undefined);
});
