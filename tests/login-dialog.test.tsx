import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { LoginDialog } from "@/components/LoginDialog";

beforeEach(() => {
  push.mockReset();
  window.sessionStorage.clear();
});

it("shows the demo credentials as a hint", () => {
  render(<LoginDialog open onOpenChange={() => {}} />);
  expect(screen.getByText(/analyst \/ fraud2026/)).toBeInTheDocument();
});

it("navigates to /dashboard on correct credentials", async () => {
  const user = userEvent.setup();
  render(<LoginDialog open onOpenChange={() => {}} />);
  await user.type(screen.getByLabelText("Username"), "analyst");
  await user.type(screen.getByLabelText("Password"), "fraud2026");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(push).toHaveBeenCalledWith("/dashboard");
  expect(window.sessionStorage.getItem("xxbank_auth")).toBe("1");
});

it("shows an error and stays put on wrong credentials", async () => {
  const user = userEvent.setup();
  render(<LoginDialog open onOpenChange={() => {}} />);
  await user.type(screen.getByLabelText("Username"), "analyst");
  await user.type(screen.getByLabelText("Password"), "wrong");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/incorrect username or password/i);
  expect(push).not.toHaveBeenCalled();
});
