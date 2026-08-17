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
import { loadReconBridgeForRun } from "@/lib/audit-ready/tie-out/reconciling-items-persistence";
import {
  applyUrmBridgeToFace,
  buildReconcilingItemsBackupTab,
  countEvidenceByReconcilingItemIds,
} from "@/lib/audit-ready/tie-out/inventory-fa-urm";

type InvItem = {
  item_ref: string | null;
  item_display_name: string;
  qty_on_hand: number;
  asset_value_cents: number;
};

export async function buildInventoryPayload(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "inventory") {
    throw new Error(`wrong_kind: expected inventory got ${ctx.tieOutKind}`);
  }
  const variances = await loadVariances(runId);
  const totals = variances.find((v) => v.entity_kind === "totals");
  const itemVars = variances.filter((v) => v.entity_kind === "item");
  const byRef = new Map(itemVars.map((v) => [v.entity_qbo_id ?? "", v]));

  const raw = ctx.rawQboPayload;
  const valuation =
    (raw?.inventory_valuation as { items?: InvItem[]; total_cents?: number }) ??
    {};
  const items = valuation.items ?? [];

  const leftAmountCents =
    totals?.subledger_amount_cents ?? valuation.total_cents ?? 0;
  const rightAmountCents = totals?.gl_amount_cents ?? 0;
  const varianceCents =
    totals?.variance_cents ?? leftAmountCents - rightAmountCents;

  const detail: BackupTabSpec = {
    tabName: "Item Detail",
    columns: [
      { key: "item_ref", label: "Item Ref", format: "text" },
      { key: "item_name", label: "Item Name", format: "text" },
      { key: "qty", label: "Qty On Hand", format: "number" },
      { key: "asset_value", label: "Asset Value", format: "currency" },
      { key: "variance_vs_gl", label: "Variance vs GL", format: "currency" },
      { key: "status", label: "Status", format: "text" },
    ],
    rows: items.map((it) => {
      const iv = byRef.get(it.item_ref ?? "");
      const isNegative = it.qty_on_hand < 0 || it.asset_value_cents < 0;
      const status = iv
        ? iv.status === "review" && isNegative
          ? "review — negative"
          : iv.status
        : isNegative
          ? "review — negative"
          : "not_applicable";
      return {
        item_ref: it.item_ref,
        item_name: it.item_display_name,
        qty: it.qty_on_hand,
        asset_value: Number(it.asset_value_cents),
        variance_vs_gl: iv ? Number(iv.variance_cents) : 0,
        status,
      };
    }),
    subtotalRow: {
      item_ref: null,
      item_name: "TOTAL",
      qty: null,
      asset_value: leftAmountCents,
      variance_vs_gl: null,
      status: null,
    },
  };

  // Fail closed: real DB/schema read errors must fail emit — never silently
  // fall back to legacy TIES when URM persisted open_material.
  // Pre-URM runs load successfully with reconOutcome = null.
  const bridge = await loadReconBridgeForRun(runId);
  const evidenceCounts = await countEvidenceByReconcilingItemIds(
    bridge.items.map((item) => item.id),
  );

  const face = applyUrmBridgeToFace(
    {
      mode: "two_sided",
      leftLabel: "Inventory Valuation",
      leftAmountCents,
      rightLabel: "GL Inventory Account",
      rightAmountCents,
      varianceCents,
      toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
      tieStatus: mapTotalsToTieStatus(totals?.status ?? ctx.totalsStatus),
      sections: [
        {
          label: "Items",
          amountCents: leftAmountCents,
          backupTabName: "Item Detail",
        },
        ...(bridge.reconOutcome
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
      tieOutKind: "inventory",
      runId,
      generatedAt: ctx.completedAt ?? new Date().toISOString(),
      regeneratedFromRunId: ctx.regeneratedFromRunId,
      regeneratedAt: ctx.regeneratedAt,
    },
    bridge,
  );

  const backupTabs: BackupTabSpec[] = [detail];
  if (bridge.reconOutcome) {
    backupTabs.push(buildReconcilingItemsBackupTab(bridge, evidenceCounts));
  }

  return {
    face,
    backupTabs,
    sourceData: sourceDataFromPayload(raw),
  };
}

export const inventoryEmitter: WorkpaperEmitter = {
  kind: "inventory",
  build: buildInventoryPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
