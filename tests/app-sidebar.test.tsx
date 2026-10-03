import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

let pathname = "/dashboard";
const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push }) }));

beforeEach(() => {
  pathname = "/dashboard";
  push.mockReset();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
});

const renderSidebar = () =>
  render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
  );

describe("AppSidebar", () => {
  it("links to Dashboard and Architecture only, under the Malaysia XX Bank brand", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /architecture/i })).toHaveAttribute("href", "/architecture");
    expect(screen.queryByRole("link", { name: /^alerts$/i })).not.toBeInTheDocument();
    expect(screen.getByText("Malaysia XX Bank")).toBeInTheDocument();
    expect(screen.getByText("Fraud Copilot")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Malaysia XX Bank logo" })).toHaveAttribute(
      "src",
      expect.stringContaining("bankIcon.png"),
    );
  });

  it("marks only the current page as active", () => {
    pathname = "/architecture";
    renderSidebar();
    expect(screen.getByRole("link", { name: /architecture/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /dashboard/i })).not.toHaveAttribute("aria-current");
  });

  it("keeps Dashboard active on an alert detail page", () => {
    pathname = "/alerts/42";
    renderSidebar();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /architecture/i })).not.toHaveAttribute("aria-current");
  });

  it("logout clears the session and returns to the landing page", async () => {
    window.sessionStorage.setItem("xxbank_auth", "1");
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /log ?out/i }));
    expect(window.sessionStorage.getItem("xxbank_auth")).toBeNull();
    expect(push).toHaveBeenCalledWith("/");
  });
});
