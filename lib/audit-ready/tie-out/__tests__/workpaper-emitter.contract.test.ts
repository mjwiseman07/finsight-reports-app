import { describe, it, expect } from "vitest";
import {
  TIE_OUT_KINDS,
  type TieOutKind,
} from "@/lib/audit-ready/tie-out-kind-classifier";
import type {
  ReconFaceSpec,
  BackupTabSpec,
  WorkpaperPayload,
  WorkpaperEmitter,
} from "@/lib/audit-ready/tie-out/workpaper-emitter";

describe("Block A — tie_out_kind enum", () => {
  it("has all 14 canonical kinds", () => {
    // 12 historical + bs_account_recon + bs_recon_summary (rename fixed_assets → rollforward)
    expect(TIE_OUT_KINDS).toHaveLength(14);
  });

  it("includes runtime-only kinds bs_account_recon and bs_recon_summary", () => {
    expect(TIE_OUT_KINDS).toContain("bs_account_recon");
    expect(TIE_OUT_KINDS).toContain("bs_recon_summary");
  });

  it("uses fixed_asset_rollforward (not legacy fixed_assets)", () => {
    expect(TIE_OUT_KINDS).toContain("fixed_asset_rollforward");
    expect(TIE_OUT_KINDS).not.toContain("fixed_assets");
  });
});

describe("Block A — WorkpaperEmitter contract shape", () => {
  it("ReconFaceSpec has the required fields", () => {
    const face: ReconFaceSpec = {
      leftLabel: "Per AP Aging Subledger",
      leftAmountCents: 100000,
      rightLabel: "Per General Ledger",
      rightAmountCents: 100000,
      varianceCents: 0,
      toleranceCents: 100,
      tieStatus: "ties",
      sections: [
        { label: "Current", amountCents: 40000, backupTabName: "Current" },
        { label: "1-30 Days", amountCents: 60000, backupTabName: "1-30 Days" },
      ],
      engagementName: "Test Client",
      engagementId: "eng-1",
      periodEnd: "2026-12-31",
      tieOutKind: "ap_aging" as TieOutKind,
      runId: "run-1",
      generatedAt: "2026-07-24T05:00:00Z",
    };
    expect(face.tieStatus).toBe("ties");
  });

  it("BackupTabSpec rows are structured records", () => {
    const tab: BackupTabSpec = {
      tabName: "Additions",
      columns: [
        { key: "date", label: "Date of Service", format: "date" },
        { key: "description", label: "Description", format: "text" },
        { key: "cost", label: "Cost", format: "currency" },
      ],
      rows: [{ date: "2026-01-15", description: "Truck", cost: 25000 }],
      subtotalRow: { description: "Total", cost: 25000 },
    };
    expect(tab.rows).toHaveLength(1);
  });

  it("WorkpaperEmitter is a structural interface (implementable)", () => {
    const stub: WorkpaperEmitter = {
      kind: "ap_aging",
      async build() {
        return {} as WorkpaperPayload;
      },
      async emitXlsx() {
        return Buffer.from("");
      },
      async emitPdf() {
        return Buffer.from("");
      },
    };
    expect(stub.kind).toBe("ap_aging");
  });
});
