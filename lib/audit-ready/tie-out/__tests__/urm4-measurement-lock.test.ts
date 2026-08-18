import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("URM-4 measurement formulas locked", () => {
  it("AR measurement remains subledger − GL (no abs)", () => {
    const math = read("lib/audit-ready/tie-out/ar-measure.ts");
    const src = read("lib/audit-ready/tie-out/ar-resolver.ts");
    expect(math).toContain("const glTotalCents = glLine ? glLine.net_cents : 0;");
    expect(math).toContain("const subTotalCents = subledger.total_cents;");
    expect(math).toContain("const totalsVariance = subTotalCents - glTotalCents;");
    expect(src).toContain("persistArUrmBridge");
    expect(src).toMatch(
      /totals_variance_cents:\s*totalsVariance[\s\S]*persistArUrmBridge[\s\S]*dualWriteWorkpaper/,
    );
  });

  it("AP measurement remains subledger − |GL|", () => {
    const math = read("lib/audit-ready/tie-out/ap-measure.ts");
    const src = read("lib/audit-ready/tie-out/ap-resolver.ts");
    expect(math).toContain("const glNetCents = glLine ? glLine.net_cents : 0;");
    expect(math).toContain("const glTotalCents = Math.abs(glNetCents);");
    expect(math).toContain("const totalsVariance = subTotalCents - glTotalCents;");
    expect(src).toContain("measureApTieOut");
    expect(src).toContain("persistApUrmBridge");
    expect(src).toMatch(
      /totals_variance_cents:\s*totalsVariance[\s\S]*persistApUrmBridge[\s\S]*dualWriteWorkpaper/,
    );
  });

  it("credit/debit balance reviews stay measurement flags (variance_cents: 0)", () => {
    const ar = read("lib/audit-ready/tie-out/ar-measure.ts");
    const ap = read("lib/audit-ready/tie-out/ap-measure.ts");
    expect(ar).toContain("credit-balance customer on AR aging");
    expect(ap).toContain("vendor_debit_balance_review");
    // Bridge helpers must not invent identified amounts from those flags.
    const urm = read("lib/audit-ready/tie-out/ar-ap-urm.ts");
    expect(urm).toContain("return [];");
    expect(urm).toContain("AR_AP_URM_OUTCOME_POLICY");
  });

  it("emitters fail closed on bridge load (no silent legacy fallback)", () => {
    const arEmit = read("lib/audit-ready/tie-out/emitters/ar-emitter.ts");
    const apEmit = read("lib/audit-ready/tie-out/emitters/ap-emitter.ts");
    expect(arEmit).toContain("const bridge = await loadReconBridgeForRun(runId);");
    expect(apEmit).toContain("const bridge = await loadReconBridgeForRun(runId);");
    expect(arEmit).not.toMatch(/catch\s*\{\s*bridge\s*=\s*null\s*\}/);
    expect(apEmit).not.toMatch(/catch\s*\{\s*bridge\s*=\s*null\s*\}/);
    expect(arEmit).toContain("countEvidenceByReconcilingItemIds");
    expect(apEmit).toContain("countEvidenceByReconcilingItemIds");
  });

  it("Reconciling Items evidence count uses FK helper, not evidence_ids cache", () => {
    const urm = read("lib/audit-ready/tie-out/ar-ap-urm.ts");
    expect(urm).toContain("countEvidenceByReconcilingItemIds");
    expect(urm).not.toMatch(/evidence_count:\s*\(item\.evidence_ids/);
  });
});
