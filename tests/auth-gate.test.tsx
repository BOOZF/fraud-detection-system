import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { AuthGate } from "@/components/AuthGate";

beforeEach(() => {
  replace.mockReset();
  window.sessionStorage.clear();
});

it("redirects to / and hides children when unauthenticated", () => {
  render(<AuthGate><p>secret dashboard</p></AuthGate>);
  expect(replace).toHaveBeenCalledWith("/");
  expect(screen.queryByText("secret dashboard")).not.toBeInTheDocument();
});

it("renders children when authenticated", () => {
  window.sessionStorage.setItem("xxbank_auth", "1");
  render(<AuthGate><p>secret dashboard</p></AuthGate>);
  expect(screen.getByText("secret dashboard")).toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
});
