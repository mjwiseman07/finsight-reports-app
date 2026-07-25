import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import type {
  BackupTabSpec,
  WorkpaperEmitter,
  WorkpaperPayload,
} from "@/lib/audit-ready/tie-out/workpaper-emitter";
import {
  emitWorkpaperPdf,
  emitWorkpaperXlsx,
} from "./_shared/emit-common";
import {
  loadRunContext,
  sourceDataFromPayload,
} from "./_shared/load-run";
import { mapTotalsToTieStatus } from "./_shared/format";

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

export async function buildFaRollforwardPayload(
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

  // Beg Balance Detail is not distinguishable in persisted lines (no
  // class/location/department either — backlog enrichment). Ship Activity
  // Detail as the beg/other catch-all with Cover note via section label.
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

  const backupTabs: BackupTabSpec[] = [
    linesToTab("Activity Detail", activityAll),
    linesToTab("Additions", additions),
    linesToTab("Disposals", disposals),
    linesToTab("Depreciation", depreciation),
    linesToTab("Reclass", reclass),
  ];

  return {
    face: {
      leftLabel: "Prepared Schedule",
      leftAmountCents,
      rightLabel: "General Ledger",
      rightAmountCents,
      varianceCents,
      toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
      tieStatus: mapTotalsToTieStatus(ctx.totalsStatus),
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
    backupTabs,
    sourceData: sourceDataFromPayload(ctx.rawQboPayload),
  };
}

export const faRollforwardEmitter: WorkpaperEmitter = {
  kind: "fixed_asset_rollforward",
  build: buildFaRollforwardPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
