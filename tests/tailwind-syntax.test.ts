import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// shadcn's generated sidebar can ship Tailwind 3 syntax. Tailwind 4 silently ignores it,
// which collapses the sidebar's layout spacer so the fixed sidebar overlays the page.
const UI_DIR = join(__dirname, "..", "components", "ui");
const files = readdirSync(UI_DIR).filter((f) => f.endsWith(".tsx"));

describe("components/ui uses Tailwind 4 syntax", () => {
  it.each(files)("%s has no Tailwind 3 CSS-variable shorthand", (file) => {
    const src = readFileSync(join(UI_DIR, file), "utf8");
    // e.g. w-[--sidebar-width] must be w-(--sidebar-width) in Tailwind 4
    expect(src).not.toMatch(/-\[--[a-z-]+\]/);
  });

  it.each(files)("%s has no theme() function calls", (file) => {
    const src = readFileSync(join(UI_DIR, file), "utf8");
    // theme(spacing.4) must be --spacing(4) in Tailwind 4
    expect(src).not.toMatch(/theme\(/);
  });
});
