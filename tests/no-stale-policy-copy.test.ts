import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The knowledge base is the uploaded PDF only. Copy that quoted the old Markdown SOP (section numbers, response
// deadlines, document name) would state things no document supports, so it must not reappear in the product UI.
const ROOT = join(__dirname, "..");
const files = ["app", "components"].flatMap((dir) => walk(join(ROOT, dir))).filter((f) => /\.(tsx?|css)$/.test(f));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const STALE = [/SOP \d+\.\d+/, /within 15 minutes/i, /within 2 hours/i, /Fraud_Operations/, /\[SOP /];

describe("product copy does not quote the removed Markdown SOP", () => {
  it.each(STALE.map((re) => [String(re), re] as const))("no source file contains %s", (_label, re) => {
    const offenders = files.filter((f) => re.test(readFileSync(f, "utf8"))).map((f) => f.replace(ROOT, ""));
    expect(offenders).toEqual([]);
  });
});
