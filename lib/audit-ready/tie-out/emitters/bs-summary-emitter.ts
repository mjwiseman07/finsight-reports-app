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

type SummaryLine = {
  classification: "Asset" | "Liability" | "Equity";
  qbo_account_id: string | null;
  qbo_account_name: string;
  qbo_account_type: string | null;
  ending_balance_cents: number;
  gl_ending_balance_cents: number;
  tie_variance_cents: number;
  totals_status: string;
  is_computed_line: boolean;
  child_run_id: string | null;
  sort_order: number;
};

type SummaryTotals = {
  assets_ending_cents: number;
  liabilities_ending_cents: number;
  equity_ending_cents: number;
  bs_equation_variance_cents: number;
  bs_equation_status: string;
  period_end: string;
};

type TxnRow = {
  ordinal: number;
  txn_date: string | null;
  txn_type: string | null;
  doc_number: string | null;
  name_display: string | null;
  memo: string | null;
  debit_cents: number;
  credit_cents: number;
  net_cents: number;
};

/** Child-run gl_detail.activity shape (bs-account-resolver payload). */
type GlActivityRow = {
  txnDate: string | null;
  txnType: string | null;
  docNumber: string | null;
  name: string | null;
  memo: string | null;
  debitCents: number;
  creditCents: number;
  netCents: number;
};

function totalsShapeComplete(t: SummaryTotals | undefined): t is SummaryTotals {
  if (!t) return false;
  return (
    typeof t.assets_ending_cents === "number" &&
    typeof t.liabilities_ending_cents === "number" &&
    typeof t.equity_ending_cents === "number" &&
    typeof t.bs_equation_variance_cents === "number" &&
    typeof t.bs_equation_status === "string" &&
    typeof t.period_end === "string"
  );
}

function linesShapeComplete(lines: SummaryLine[] | undefined): lines is SummaryLine[] {
  if (!Array.isArray(lines)) return false;
  return lines.every(
    (l) =>
      typeof l.qbo_account_name === "string" &&
      typeof l.ending_balance_cents === "number" &&
      typeof l.totals_status === "string" &&
      typeof l.is_computed_line === "boolean",
  );
}

function includedAccountsTab(lines: SummaryLine[]): BackupTabSpec {
  return {
    tabName: "Included Accounts",
    columns: [
      { key: "classification", label: "Classification", format: "text" },
      { key: "qbo_account_name", label: "Account", format: "text" },
      { key: "qbo_account_type", label: "Type", format: "text" },
      { key: "ending_balance_cents", label: "Ending", format: "currency" },
      { key: "gl_ending_balance_cents", label: "GL Ending", format: "currency" },
      { key: "tie_variance_cents", label: "Variance", format: "currency" },
      { key: "totals_status", label: "Status", format: "text" },
      { key: "is_computed_line", label: "Computed", format: "text" },
    ],
    rows: lines.map((l) => ({
      classification: l.classification,
      qbo_account_name: l.qbo_account_name,
      qbo_account_type: l.qbo_account_type,
      ending_balance_cents: Number(l.ending_balance_cents),
      gl_ending_balance_cents: Number(l.gl_ending_balance_cents),
      tie_variance_cents: Number(l.tie_variance_cents),
      totals_status: l.totals_status,
      is_computed_line: l.is_computed_line ? "yes" : "no",
    })),
  };
}

function emptyAccountTab(tabName: string): BackupTabSpec {
  return {
    tabName,
    columns: [{ key: "note", label: "Note", format: "text" }],
    rows: [
      {
        note: "No transaction detail — computed from parent run rollup",
      },
    ],
  };
}

function txnListToTab(tabName: string, txnList: TxnRow[]): BackupTabSpec {
  return {
    tabName,
    columns: [
      { key: "ordinal", label: "Ordinal", format: "number" },
      { key: "txn_date", label: "Date", format: "date" },
      { key: "txn_type", label: "Type", format: "text" },
      { key: "doc_number", label: "Doc #", format: "text" },
      { key: "name_display", label: "Name", format: "text" },
      { key: "memo", label: "Memo", format: "text" },
      { key: "debit_cents", label: "Debit", format: "currency" },
      { key: "credit_cents", label: "Credit", format: "currency" },
      { key: "net_cents", label: "Net", format: "currency" },
    ],
    rows: txnList.map((t) => ({
      ordinal: t.ordinal,
      txn_date: t.txn_date,
      txn_type: t.txn_type,
      doc_number: t.doc_number,
      name_display: t.name_display,
      memo: t.memo,
      debit_cents: Number(t.debit_cents),
      credit_cents: Number(t.credit_cents),
      net_cents: Number(t.net_cents),
    })),
  };
}

function activityToTxnRows(activity: GlActivityRow[]): TxnRow[] {
  return activity.map((r, i) => ({
    ordinal: i,
    txn_date: r.txnDate,
    txn_type: r.txnType,
    doc_number: r.docNumber,
    name_display: r.name,
    memo: r.memo,
    debit_cents: Number(r.debitCents),
    credit_cents: Number(r.creditCents),
    net_cents: Number(r.netCents),
  }));
}

async function loadChildTxnRows(childRunId: string): Promise<TxnRow[] | null> {
  try {
    const child = await loadRunContext(childRunId);
    const gl = child.rawQboPayload?.gl_detail as
      | { activity?: GlActivityRow[] }
      | undefined;
    if (gl && Array.isArray(gl.activity)) {
      return activityToTxnRows(gl.activity);
    }
  } catch {
    // Fall through to legacy transactions table.
  }

  // PBC-TIEOUT-4.1.3.b removes this fallback
  const supabase = getSupabaseAdmin();
  const { data: txns } = await supabase
    .from("audit_ready_bs_recon_transactions")
    .select(
      "ordinal, txn_date, txn_type, doc_number, name_display, memo, debit_cents, credit_cents, net_cents",
    )
    .eq("run_id", childRunId)
    .order("ordinal", { ascending: true });
  return (txns ?? []) as TxnRow[];
}

async function buildPerAccountTabs(lines: SummaryLine[]): Promise<BackupTabSpec[]> {
  const perAccountTabs: BackupTabSpec[] = [];
  for (const line of lines) {
    const tabName = (line.qbo_account_name || "Account").slice(0, 28);
    if (line.is_computed_line || !line.child_run_id) {
      perAccountTabs.push(emptyAccountTab(tabName));
      continue;
    }
    const txnList = await loadChildTxnRows(line.child_run_id);
    if (!txnList || txnList.length === 0) {
      perAccountTabs.push(emptyAccountTab(tabName));
      continue;
    }
    perAccountTabs.push(txnListToTab(tabName, txnList));
  }
  return perAccountTabs;
}

function buildFaceAndBackup(
  ctx: RunContext,
  runId: string,
  totals: SummaryTotals,
  lines: SummaryLine[],
  variances: VarianceRow[],
  perAccountTabs: BackupTabSpec[],
): WorkpaperPayload {
  const leftAmountCents = Number(totals.assets_ending_cents);
  const rightAmountCents =
    Number(totals.liabilities_ending_cents) + Number(totals.equity_ending_cents);
  const varianceCents = Number(totals.bs_equation_variance_cents);
  const totalsVar = variances.find((v) => v.entity_kind === "totals");

  const sections = [
    {
      label: "Assets",
      amountCents: Number(totals.assets_ending_cents),
      backupTabName: "Included Accounts",
    },
    {
      label: "Liabilities",
      amountCents: Number(totals.liabilities_ending_cents),
      backupTabName: "Included Accounts",
    },
    {
      label: "Equity",
      amountCents: Number(totals.equity_ending_cents),
      backupTabName: "Included Accounts",
    },
  ];
  for (const c of lines.filter((l) => l.is_computed_line)) {
    sections.push({
      label: c.qbo_account_name || "Computed",
      amountCents: Number(c.ending_balance_cents),
      backupTabName: "Included Accounts",
    });
  }

  const face: ReconFaceSpec = {
    leftLabel: "Sum of Included Accounts",
    leftAmountCents,
    rightLabel: "QBO Balance Sheet",
    rightAmountCents,
    varianceCents,
    toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
    tieStatus: mapTotalsToTieStatus(
      totals.bs_equation_status === "kickout"
        ? "kickout"
        : (totalsVar?.status ?? ctx.totalsStatus),
    ),
    sections,
    engagementName: ctx.engagementName,
    engagementId: ctx.engagementId,
    periodEnd: totals.period_end || ctx.periodEnd,
    tieOutKind: "bs_recon_summary",
    runId,
    generatedAt: ctx.completedAt ?? new Date().toISOString(),
    regeneratedFromRunId: ctx.regeneratedFromRunId,
    regeneratedAt: ctx.regeneratedAt,
  };

  return {
    face,
    backupTabs: [includedAccountsTab(lines), ...perAccountTabs],
    sourceData: sourceDataFromPayload(ctx.rawQboPayload),
  };
}

function assembleSummaryFaceFromRun(
  ctx: RunContext,
  totals: SummaryTotals,
  lines: SummaryLine[],
  variances: VarianceRow[],
): ReconFaceSpec | null {
  if (
    ctx.subledgerTotalCents == null ||
    ctx.glTotalCents == null ||
    ctx.totalsVarianceCents == null
  ) {
    return null;
  }

  const leftAmountCents = Number(totals.assets_ending_cents);
  const rightAmountCents =
    Number(totals.liabilities_ending_cents) + Number(totals.equity_ending_cents);
  const varianceCents = Number(totals.bs_equation_variance_cents);
  const totalsVar = variances.find((v) => v.entity_kind === "totals");

  const sections = [
    {
      label: "Assets",
      amountCents: Number(totals.assets_ending_cents),
      backupTabName: "Included Accounts",
    },
    {
      label: "Liabilities",
      amountCents: Number(totals.liabilities_ending_cents),
      backupTabName: "Included Accounts",
    },
    {
      label: "Equity",
      amountCents: Number(totals.equity_ending_cents),
      backupTabName: "Included Accounts",
    },
  ];
  for (const c of lines.filter((l) => l.is_computed_line)) {
    sections.push({
      label: c.qbo_account_name || "Computed",
      amountCents: Number(c.ending_balance_cents),
      backupTabName: "Included Accounts",
    });
  }

  return {
    leftLabel: "Sum of Included Accounts",
    leftAmountCents,
    rightLabel: "QBO Balance Sheet",
    rightAmountCents,
    varianceCents,
    toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
    tieStatus: mapTotalsToTieStatus(
      totals.bs_equation_status === "kickout"
        ? "kickout"
        : (totalsVar?.status ?? ctx.totalsStatus),
    ),
    sections,
    engagementName: ctx.engagementName,
    engagementId: ctx.engagementId,
    periodEnd: totals.period_end || ctx.periodEnd,
    tieOutKind: "bs_recon_summary",
    runId: ctx.runId,
    generatedAt: ctx.completedAt ?? new Date().toISOString(),
    regeneratedFromRunId: ctx.regeneratedFromRunId,
    regeneratedAt: ctx.regeneratedAt,
  };
}

async function assembleSummaryBackupFromPayload(
  lines: SummaryLine[],
): Promise<BackupTabSpec[] | null> {
  if (!linesShapeComplete(lines)) return null;
  const perAccountTabs = await buildPerAccountTabs(lines);
  return [includedAccountsTab(lines), ...perAccountTabs];
}

// PBC-TIEOUT-4.1.3.b removes this function entirely
async function readLegacyBsReconSummaryArtifact(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "bs_recon_summary") {
    throw new Error(`wrong_kind: expected bs_recon_summary got ${ctx.tieOutKind}`);
  }
  const supabase = getSupabaseAdmin();
  const { data: art, error: artErr } = await supabase
    .from("audit_ready_bs_recon_summary_artifacts")
    .select(
      "assets_ending_cents, liabilities_ending_cents, equity_ending_cents, bs_equation_variance_cents, bs_equation_status, period_end",
    )
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (artErr || !art) {
    throw new Error(`bs_summary_artifact_not_found: ${artErr?.message ?? runId}`);
  }
  const totals = art as SummaryTotals;
  const { data: lineRows, error: lineErr } = await supabase
    .from("audit_ready_bs_recon_summary_lines")
    .select(
      "classification, qbo_account_id, qbo_account_name, qbo_account_type, ending_balance_cents, gl_ending_balance_cents, tie_variance_cents, totals_status, is_computed_line, child_run_id, sort_order",
    )
    .eq("run_id", runId)
    .order("sort_order", { ascending: true });
  if (lineErr) throw new Error(`bs_summary_lines_failed: ${lineErr.message}`);
  const lines = (lineRows ?? []) as SummaryLine[];
  const variances = await loadVariances(runId);
  const perAccountTabs = await buildPerAccountTabs(lines);
  return buildFaceAndBackup(ctx, runId, totals, lines, variances, perAccountTabs);
}

export async function buildBsSummaryPayload(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "bs_recon_summary") {
    throw new Error(`wrong_kind: expected bs_recon_summary got ${ctx.tieOutKind}`);
  }

  const raw = ctx.rawQboPayload;
  const summaryTotals = raw?.summary_totals as SummaryTotals | undefined;
  const summaryLines = raw?.summary_lines as SummaryLine[] | undefined;

  // Primary — PBC-TIEOUT-4.1.3.b removes this fallback
  if (
    !raw ||
    !totalsShapeComplete(summaryTotals) ||
    !linesShapeComplete(summaryLines) ||
    ctx.subledgerTotalCents == null ||
    ctx.glTotalCents == null ||
    ctx.totalsVarianceCents == null
  ) {
    return readLegacyBsReconSummaryArtifact(runId);
  }

  const variances = await loadVariances(runId);
  const face = assembleSummaryFaceFromRun(
    ctx,
    summaryTotals,
    summaryLines,
    variances,
  );
  const backupTabs = await assembleSummaryBackupFromPayload(summaryLines);
  // PBC-TIEOUT-4.1.3.b removes this fallback
  if (!face || !backupTabs) {
    return readLegacyBsReconSummaryArtifact(runId);
  }

  return {
    face,
    backupTabs,
    sourceData: sourceDataFromPayload(raw),
  };
}

export const bsSummaryEmitter: WorkpaperEmitter = {
  kind: "bs_recon_summary",
  build: buildBsSummaryPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
