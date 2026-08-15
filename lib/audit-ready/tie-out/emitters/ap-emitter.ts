import type {
  BackupTabSpec,
  WorkpaperEmitter,
  WorkpaperPayload,
} from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { emitWorkpaperPdf, emitWorkpaperXlsx } from "./_shared/emit-common";
import {
  loadRunContext,
  loadVariances,
  sourceDataFromPayload,
} from "./_shared/load-run";
import { mapTotalsToTieStatus } from "./_shared/format";
import {
  applyUrmBridgeToFace,
  buildReconcilingItemsBackupTab,
} from "@/lib/audit-ready/tie-out/ar-ap-urm";
import { loadReconBridgeForRun } from "@/lib/audit-ready/tie-out/reconciling-items-persistence";

type AgingVendor = {
  vendor_ref: string | null;
  vendor_display_name: string;
  total_cents: number;
};

export async function buildApPayload(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "ap_aging") {
    throw new Error(`wrong_kind: expected ap_aging got ${ctx.tieOutKind}`);
  }
  const variances = await loadVariances(runId);
  const totals = variances.find((v) => v.entity_kind === "totals");
  const vendorVars = variances.filter((v) => v.entity_kind === "vendor");
  const byRef = new Map(vendorVars.map((v) => [v.entity_qbo_id ?? "", v]));

  const raw = ctx.rawQboPayload;
  const aging = (raw?.aging_detail as { vendors?: AgingVendor[]; total_cents?: number }) ?? {};
  const vendors = aging.vendors ?? [];

  const leftAmountCents =
    totals?.subledger_amount_cents ?? aging.total_cents ?? 0;
  const rightAmountCents = totals?.gl_amount_cents ?? 0;
  const varianceCents = totals?.variance_cents ?? leftAmountCents - rightAmountCents;

  const rollup: BackupTabSpec = {
    tabName: "Vendor Rollup",
    columns: [
      { key: "vendor_ref", label: "Vendor Ref", format: "text" },
      { key: "vendor_name", label: "Vendor Name", format: "text" },
      { key: "subledger_total", label: "Subledger Total", format: "currency" },
      { key: "variance_vs_gl", label: "Variance vs GL", format: "currency" },
      { key: "status", label: "Status", format: "text" },
    ],
    rows: vendors.map((v) => {
      const vv = byRef.get(v.vendor_ref ?? "");
      const isDebit = Number(v.total_cents) < 0;
      const status = vv
        ? vv.status === "review" && isDebit
          ? "review — debit balance"
          : vv.status
        : "not_applicable";
      return {
        vendor_ref: v.vendor_ref,
        vendor_name: v.vendor_display_name,
        subledger_total: Number(v.total_cents),
        variance_vs_gl: vv ? Number(vv.variance_cents) : 0,
        status,
      };
    }),
    subtotalRow: {
      vendor_ref: null,
      vendor_name: "TOTAL",
      subledger_total: leftAmountCents,
      variance_vs_gl: null,
      status: null,
    },
  };

  let bridge = null;
  try {
    bridge = await loadReconBridgeForRun(runId);
  } catch {
    bridge = null;
  }

  const face = applyUrmBridgeToFace(
    {
      mode: "two_sided",
      leftLabel: "AP Subledger",
      leftAmountCents,
      rightLabel: "GL AP Account",
      rightAmountCents,
      varianceCents,
      toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
      tieStatus: mapTotalsToTieStatus(totals?.status ?? ctx.totalsStatus),
      sections: [
        {
          label: "Vendors",
          amountCents: leftAmountCents,
          backupTabName: "Vendor Rollup",
        },
        ...(bridge?.reconOutcome
          ? [
              {
                label: "Reconciling Items",
                amountCents: bridge.identifiedItemsTotalCents ?? 0,
                backupTabName: "Reconciling Items",
              },
            ]
          : []),
      ],
      engagementName: ctx.engagementName,
      engagementId: ctx.engagementId,
      periodEnd: ctx.periodEnd,
      tieOutKind: "ap_aging",
      runId,
      generatedAt: ctx.completedAt ?? new Date().toISOString(),
      regeneratedFromRunId: ctx.regeneratedFromRunId,
      regeneratedAt: ctx.regeneratedAt,
    },
    bridge,
  );

  const backupTabs: BackupTabSpec[] = [rollup];
  if (bridge?.reconOutcome) {
    backupTabs.push(buildReconcilingItemsBackupTab(bridge));
  }

  return {
    face,
    backupTabs,
    sourceData: sourceDataFromPayload(raw),
  };
}

export const apEmitter: WorkpaperEmitter = {
  kind: "ap_aging",
  build: buildApPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
