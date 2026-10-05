import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { Page } from "@/components/PageShell";

it("uses the full width of the window instead of a narrow centred column", () => {
  const { container } = render(<Page>content</Page>);
  const root = container.firstElementChild as HTMLElement;
  expect(root.className).toMatch(/\bw-full\b/);
  expect(root.className).not.toMatch(/max-w-/);
});
