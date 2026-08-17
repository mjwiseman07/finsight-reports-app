import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("URM-5 measurement formulas locked", () => {
  it("Inventory measurement remains subledger − GL (debit-normal, no abs)", () => {
    const src = read("lib/audit-ready/tie-out/inventory-resolver.ts");
    expect(src).toContain(
      "const glTotalCents = glLine ? glLine.net_cents : 0; // Inventory is debit-normal",
    );
    expect(src).toContain("const subTotalCents = subledger.total_cents;");
    expect(src).toContain("const totalsVariance = subTotalCents - glTotalCents;");
    expect(src).toContain("persistInventoryUrmBridge");
    expect(src).toMatch(
      /totals_variance_cents:\s*totalsVariance[\s\S]*persistInventoryUrmBridge[\s\S]*dualWriteWorkpaper/,
    );
  });

  it("FA measurement remains NBV schedule − NBV GL", () => {
    const src = read("lib/audit-ready/tie-out/fa-rollforward-resolver.ts");
    expect(src).toContain("subledger_total_cents: nbvEnd,");
    expect(src).toContain("gl_total_cents: costGlEnd - accumGlEnd,");
    expect(src).toContain(
      "totals_variance_cents: costEnd - accumEnd - (costGlEnd - accumGlEnd),",
    );
    expect(src).toContain("persistFaUrmBridge");
    expect(src).toMatch(
      /totals_variance_cents:\s*costEnd - accumEnd - \(costGlEnd - accumGlEnd\)[\s\S]*persistFaUrmBridge[\s\S]*dualWriteWorkpaper/,
    );
  });

  it("negative inventory qty/value reviews stay measurement flags (variance_cents: 0)", () => {
    const inv = read("lib/audit-ready/tie-out/inventory-resolver.ts");
    expect(inv).toContain("item_negative_qty_on_hand");
    expect(inv).toContain("item_negative_asset_value");
    expect(inv).toContain("variance_cents: 0");
    const urm = read("lib/audit-ready/tie-out/inventory-fa-urm.ts");
    expect(urm).toContain("return [];");
    expect(urm).toContain("INVENTORY_FA_URM_OUTCOME_POLICY");
  });

  it("emitters fail closed on bridge load (no silent legacy fallback)", () => {
    const invEmit = read(
      "lib/audit-ready/tie-out/emitters/inventory-emitter.ts",
    );
    const faEmit = read(
      "lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts",
    );
    expect(invEmit).toContain("const bridge = await loadReconBridgeForRun(runId);");
    expect(faEmit).toContain("const bridge = await loadReconBridgeForRun(runId);");
    expect(invEmit).not.toMatch(/catch\s*\{\s*bridge\s*=\s*null\s*\}/);
    expect(faEmit).not.toMatch(/catch\s*\{\s*bridge\s*=\s*null\s*\}/);
    expect(invEmit).toContain("countEvidenceByReconcilingItemIds");
    expect(faEmit).toContain("countEvidenceByReconcilingItemIds");
  });

  it("Reconciling Items evidence count uses FK helper, not evidence_ids cache", () => {
    const urm = read("lib/audit-ready/tie-out/inventory-fa-urm.ts");
    expect(urm).toContain("countEvidenceByReconcilingItemIds");
    expect(urm).not.toMatch(/evidence_count:\s*\(item\.evidence_ids/);
  });
});
