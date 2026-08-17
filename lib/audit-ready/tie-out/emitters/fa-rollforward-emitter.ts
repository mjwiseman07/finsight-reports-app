import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import type {
  BackupTabSpec,
  ReconFaceSpec,
  WorkpaperEmitter,
  WorkpaperPayload,
} from "@/lib/audit-ready/tie-out/workpaper-emitter";
import {
  emitWorkpaperPdf,
  emitWorkpaperXlsx,
} from "./_shared/emit-common";
import {
  loadRunContext,
  loadVariances,
  sourceDataFromPayload,
  type RunContext,
  type VarianceRow,
} from "./_shared/load-run";
import { mapTotalsToTieStatus } from "./_shared/format";
import { loadReconBridgeForRun } from "@/lib/audit-ready/tie-out/reconciling-items-persistence";
import {
  applyUrmBridgeToFace,
  buildReconcilingItemsBackupTab,
  countEvidenceByReconcilingItemIds,
} from "@/lib/audit-ready/tie-out/inventory-fa-urm";

type ArtifactRow = {
  cost_beginning_cents: number;
  cost_additions_cents: number;
  cost_disposals_cents: number;
  cost_reclass_cents: number;
  cost_ending_cents: number;
  cost_gl_ending_cents: number;
  accum_beginning_cents: number;
  accum_depreciation_cents: number;
  accum_disposals_cents: number;
  accum_reclass_cents: number;
  accum_ending_cents: number;
  accum_gl_ending_cents: number;
  nbv_beginning_cents: number;
  nbv_ending_cents: number;
  period_end: string;
};

type LineRow = {
  side: "cost" | "accum";
  bucket: "addition" | "disposal" | "depreciation" | "reclass" | "other";
  qbo_account_id: string;
  qbo_account_name: string;
  txn_date: string;
  txn_type: string;
  doc_number: string | null;
  name_display: string | null;
  memo: string | null;
  split_account: string | null;
  debit_cents: number;
  credit_cents: number;
  signed_cents: number;
};

/** Shape of rollforward_totals as written by fa-rollforward-resolver (payload v2). */
type RollforwardTotals = ArtifactRow;

const LINE_COLUMNS: BackupTabSpec["columns"] = [
  { key: "txn_date", label: "Date", format: "date" },
  { key: "txn_type", label: "Type", format: "text" },
  { key: "qbo_account_id", label: "QBO Account ID", format: "text" },
  { key: "qbo_account_name", label: "QBO Account", format: "text" },
  { key: "doc_number", label: "Doc #", format: "text" },
  { key: "name_display", label: "Name", format: "text" },
  { key: "memo", label: "Memo", format: "text" },
  { key: "split_account", label: "Split Account", format: "text" },
  { key: "debit_cents", label: "Debit", format: "currency" },
  { key: "credit_cents", label: "Credit", format: "currency" },
  { key: "signed_cents", label: "Signed Net", format: "currency" },
];

function linesToTab(tabName: string, lines: LineRow[]): BackupTabSpec {
  const signedSum = lines.reduce((s, l) => s + Number(l.signed_cents), 0);
  return {
    tabName,
    columns: LINE_COLUMNS,
    rows: lines.map((l) => ({
      txn_date: l.txn_date,
      txn_type: l.txn_type,
      qbo_account_id: l.qbo_account_id,
      qbo_account_name: l.qbo_account_name,
      doc_number: l.doc_number,
      name_display: l.name_display,
      memo: l.memo,
      split_account: l.split_account,
      debit_cents: Number(l.debit_cents),
      credit_cents: Number(l.credit_cents),
      signed_cents: Number(l.signed_cents),
    })),
    subtotalRow: {
      txn_date: null,
      txn_type: "Subtotal",
      qbo_account_id: null,
      qbo_account_name: null,
      doc_number: null,
      name_display: null,
      memo: null,
      split_account: null,
      debit_cents: null,
      credit_cents: null,
      signed_cents: signedSum,
    },
  };
}

async function overlayUrmBridge(
  runId: string,
  payload: WorkpaperPayload,
): Promise<WorkpaperPayload> {
  // Fail closed: real DB/schema read errors must fail emit — never silently
  // fall back to legacy TIES when URM persisted open_material.
  // Pre-URM runs load successfully with reconOutcome = null.
  const bridge = await loadReconBridgeForRun(runId);
  const evidenceCounts = await countEvidenceByReconcilingItemIds(
    bridge.items.map((item) => item.id),
  );
  const face = applyUrmBridgeToFace(
    {
      ...payload.face,
      sections: [
        ...(payload.face.sections ?? []),
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
    },
    bridge,
  );
  const backupTabs = [...payload.backupTabs];
  if (bridge.reconOutcome) {
    backupTabs.push(buildReconcilingItemsBackupTab(bridge, evidenceCounts));
  }
  return {
    ...payload,
    face,
    backupTabs,
  };
}

function buildPayloadFromArtifactAndLines(
  ctx: RunContext,
  runId: string,
  artifact: ArtifactRow,
  lines: LineRow[],
  variances: VarianceRow[],
): WorkpaperPayload {
  const leftAmountCents = Number(artifact.nbv_ending_cents);
  const rightAmountCents =
    Number(artifact.cost_gl_ending_cents) -
    Number(artifact.accum_gl_ending_cents);
  const varianceCents = leftAmountCents - rightAmountCents;

  const additions = lines.filter(
    (l) => l.side === "cost" && l.bucket === "addition",
  );
  const disposals = lines.filter(
    (l) => l.side === "cost" && l.bucket === "disposal",
  );
  const depreciation = lines.filter(
    (l) => l.side === "accum" && l.bucket === "depreciation",
  );
  const reclass = lines.filter((l) => l.bucket === "reclass");
  const activityAll = lines;

  const sections = [
    {
      label: "Beginning Balance (NBV)",
      amountCents: Number(artifact.nbv_beginning_cents),
      backupTabName: "Activity Detail",
    },
    {
      label: "Additions",
      amountCents: Number(artifact.cost_additions_cents),
      backupTabName: "Additions",
    },
    {
      label: "Disposals",
      amountCents: Number(artifact.cost_disposals_cents),
      backupTabName: "Disposals",
    },
    {
      label: "Depreciation",
      amountCents: Number(artifact.accum_depreciation_cents),
      backupTabName: "Depreciation",
    },
    {
      label: "Reclass",
      amountCents: Number(artifact.cost_reclass_cents),
      backupTabName: "Reclass",
    },
    {
      label: "Ending Balance (NBV)",
      amountCents: leftAmountCents,
      backupTabName: "Activity Detail",
    },
  ];

  const totals = variances.find((v) => v.entity_kind === "totals");

  return {
    face: {
      leftLabel: "Prepared Schedule",
      leftAmountCents,
      rightLabel: "General Ledger",
      rightAmountCents,
      varianceCents,
      toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
      tieStatus: mapTotalsToTieStatus(totals?.status ?? ctx.totalsStatus),
      sections,
      engagementName: ctx.engagementName,
      engagementId: ctx.engagementId,
      periodEnd: artifact.period_end || ctx.periodEnd,
      tieOutKind: "fixed_asset_rollforward",
      runId,
      generatedAt: ctx.completedAt ?? new Date().toISOString(),
      regeneratedFromRunId: ctx.regeneratedFromRunId,
      regeneratedAt: ctx.regeneratedAt,
    },
    backupTabs: [
      linesToTab("Activity Detail", activityAll),
      linesToTab("Additions", additions),
      linesToTab("Disposals", disposals),
      linesToTab("Depreciation", depreciation),
      linesToTab("Reclass", reclass),
    ],
    sourceData: sourceDataFromPayload(ctx.rawQboPayload),
  };
}

function totalsShapeComplete(t: RollforwardTotals | undefined): t is RollforwardTotals {
  if (!t) return false;
  return (
    typeof t.nbv_beginning_cents === "number" &&
    typeof t.nbv_ending_cents === "number" &&
    typeof t.cost_additions_cents === "number" &&
    typeof t.cost_disposals_cents === "number" &&
    typeof t.cost_reclass_cents === "number" &&
    typeof t.cost_ending_cents === "number" &&
    typeof t.cost_gl_ending_cents === "number" &&
    typeof t.accum_depreciation_cents === "number" &&
    typeof t.accum_gl_ending_cents === "number" &&
    typeof t.accum_ending_cents === "number" &&
    typeof t.accum_beginning_cents === "number"
  );
}

function assembleFaFaceFromRun(
  ctx: RunContext,
  totals: RollforwardTotals,
  variances: VarianceRow[],
): ReconFaceSpec | null {
  if (
    ctx.subledgerTotalCents == null ||
    ctx.glTotalCents == null ||
    ctx.totalsVarianceCents == null
  ) {
    return null;
  }

  const leftAmountCents = Number(totals.nbv_ending_cents);
  const rightAmountCents =
    Number(totals.cost_gl_ending_cents) - Number(totals.accum_gl_ending_cents);
  const varianceCents = leftAmountCents - rightAmountCents;
  const totalsVar = variances.find((v) => v.entity_kind === "totals");

  return {
    leftLabel: "Prepared Schedule",
    leftAmountCents,
    rightLabel: "General Ledger",
    rightAmountCents,
    varianceCents,
    toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
    tieStatus: mapTotalsToTieStatus(totalsVar?.status ?? ctx.totalsStatus),
    sections: [
      {
        label: "Beginning Balance (NBV)",
        amountCents: Number(totals.nbv_beginning_cents),
        backupTabName: "Activity Detail",
      },
      {
        label: "Additions",
        amountCents: Number(totals.cost_additions_cents),
        backupTabName: "Additions",
      },
      {
        label: "Disposals",
        amountCents: Number(totals.cost_disposals_cents),
        backupTabName: "Disposals",
      },
      {
        label: "Depreciation",
        amountCents: Number(totals.accum_depreciation_cents),
        backupTabName: "Depreciation",
      },
      {
        label: "Reclass",
        amountCents: Number(totals.cost_reclass_cents),
        backupTabName: "Reclass",
      },
      {
        label: "Ending Balance (NBV)",
        amountCents: leftAmountCents,
        backupTabName: "Activity Detail",
      },
    ],
    engagementName: ctx.engagementName,
    engagementId: ctx.engagementId,
    periodEnd: totals.period_end || ctx.periodEnd,
    tieOutKind: "fixed_asset_rollforward",
    runId: ctx.runId,
    generatedAt: ctx.completedAt ?? new Date().toISOString(),
    regeneratedFromRunId: ctx.regeneratedFromRunId,
    regeneratedAt: ctx.regeneratedAt,
  };
}

function assembleFaBackupFromPayload(lines: LineRow[]): BackupTabSpec[] | null {
  if (!Array.isArray(lines)) return null;
  const additions = lines.filter(
    (l) => l.side === "cost" && l.bucket === "addition",
  );
  const disposals = lines.filter(
    (l) => l.side === "cost" && l.bucket === "disposal",
  );
  const depreciation = lines.filter(
    (l) => l.side === "accum" && l.bucket === "depreciation",
  );
  const reclass = lines.filter((l) => l.bucket === "reclass");
  return [
    linesToTab("Activity Detail", lines),
    linesToTab("Additions", additions),
    linesToTab("Disposals", disposals),
    linesToTab("Depreciation", depreciation),
    linesToTab("Reclass", reclass),
  ];
}

// PBC-TIEOUT-4.1.3.b removes this function entirely
async function readLegacyFaRollforwardArtifact(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "fixed_asset_rollforward") {
    throw new Error(
      `wrong_kind: expected fixed_asset_rollforward got ${ctx.tieOutKind}`,
    );
  }
  const supabase = getSupabaseAdmin();
  const { data: art, error: artErr } = await supabase
    .from("audit_ready_fa_rollforward_artifacts")
    .select(
      "cost_beginning_cents, cost_additions_cents, cost_disposals_cents, cost_reclass_cents, cost_ending_cents, cost_gl_ending_cents, accum_beginning_cents, accum_depreciation_cents, accum_disposals_cents, accum_reclass_cents, accum_ending_cents, accum_gl_ending_cents, nbv_beginning_cents, nbv_ending_cents, period_end",
    )
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (artErr || !art) {
    throw new Error(`fa_artifact_not_found: ${artErr?.message ?? runId}`);
  }
  const artifact = art as ArtifactRow;
  const { data: lineRows, error: lineErr } = await supabase
    .from("audit_ready_fa_rollforward_lines")
    .select(
      "side, bucket, qbo_account_id, qbo_account_name, txn_date, txn_type, doc_number, name_display, memo, split_account, debit_cents, credit_cents, signed_cents",
    )
    .eq("run_id", runId)
    .order("ordinal", { ascending: true });
  if (lineErr) throw new Error(`fa_lines_query_failed: ${lineErr.message}`);
  const lines = (lineRows ?? []) as LineRow[];
  const variances = await loadVariances(runId);
  return buildPayloadFromArtifactAndLines(ctx, runId, artifact, lines, variances);
}

export async function buildFaRollforwardPayload(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "fixed_asset_rollforward") {
    throw new Error(
      `wrong_kind: expected fixed_asset_rollforward got ${ctx.tieOutKind}`,
    );
  }

  const raw = ctx.rawQboPayload;
  const rollforwardTotals = raw?.rollforward_totals as
    | RollforwardTotals
    | undefined;
  const payloadLines = raw?.lines as LineRow[] | undefined;

  // Primary — PBC-TIEOUT-4.1.3.b removes this fallback
  if (
    !raw ||
    !totalsShapeComplete(rollforwardTotals) ||
    !Array.isArray(payloadLines) ||
    ctx.subledgerTotalCents == null ||
    ctx.glTotalCents == null ||
    ctx.totalsVarianceCents == null
  ) {
    return overlayUrmBridge(runId, await readLegacyFaRollforwardArtifact(runId));
  }

  const variances = await loadVariances(runId);
  const face = assembleFaFaceFromRun(ctx, rollforwardTotals, variances);
  const backupTabs = assembleFaBackupFromPayload(payloadLines);
  // PBC-TIEOUT-4.1.3.b removes this fallback
  if (!face || !backupTabs) {
    return overlayUrmBridge(runId, await readLegacyFaRollforwardArtifact(runId));
  }

  return overlayUrmBridge(runId, {
    face,
    backupTabs,
    sourceData: sourceDataFromPayload(raw),
  });
}

export const faRollforwardEmitter: WorkpaperEmitter = {
  kind: "fixed_asset_rollforward",
  build: buildFaRollforwardPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
