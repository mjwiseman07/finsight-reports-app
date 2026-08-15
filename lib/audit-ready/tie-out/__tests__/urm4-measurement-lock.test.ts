import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("URM-4 measurement formulas locked", () => {
  it("AR measurement remains subledger − GL (no abs)", () => {
    const src = read("lib/audit-ready/tie-out/ar-resolver.ts");
    expect(src).toContain("const glTotalCents = glLine ? glLine.net_cents : 0;");
    expect(src).toContain("const subTotalCents = subledger.total_cents;");
    expect(src).toContain("const totalsVariance = subTotalCents - glTotalCents;");
    expect(src).toContain("persistArUrmBridge");
    expect(src).toMatch(
      /totals_variance_cents:\s*totalsVariance[\s\S]*persistArUrmBridge[\s\S]*dualWriteWorkpaper/,
    );
  });

  it("AP measurement remains subledger − |GL|", () => {
    const src = read("lib/audit-ready/tie-out/ap-resolver.ts");
    expect(src).toContain("const glNetCents = glLine ? glLine.net_cents : 0;");
    expect(src).toContain("const glTotalCents = Math.abs(glNetCents);");
    expect(src).toContain("const totalsVariance = subTotalCents - glTotalCents;");
    expect(src).toContain("persistApUrmBridge");
    expect(src).toMatch(
      /totals_variance_cents:\s*totalsVariance[\s\S]*persistApUrmBridge[\s\S]*dualWriteWorkpaper/,
    );
  });

  it("credit/debit balance reviews stay measurement flags (variance_cents: 0)", () => {
    const ar = read("lib/audit-ready/tie-out/ar-resolver.ts");
    const ap = read("lib/audit-ready/tie-out/ap-resolver.ts");
    expect(ar).toContain("credit-balance customer on AR aging");
    expect(ap).toContain("vendor_debit_balance_review");
    // Bridge helpers must not invent identified amounts from those flags.
    const urm = read("lib/audit-ready/tie-out/ar-ap-urm.ts");
    expect(urm).toContain("return [];");
    expect(urm).toContain("AR_AP_URM_OUTCOME_POLICY");
  });
});
