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

type SummaryArtifact = {
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

export async function buildBsSummaryPayload(
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
  const artifact = art as SummaryArtifact;
  const { data: lineRows, error: lineErr } = await supabase
    .from("audit_ready_bs_recon_summary_lines")
    .select(
      "classification, qbo_account_id, qbo_account_name, qbo_account_type, ending_balance_cents, gl_ending_balance_cents, tie_variance_cents, totals_status, is_computed_line, child_run_id, sort_order",
    )
    .eq("run_id", runId)
    .order("sort_order", { ascending: true });
  if (lineErr) throw new Error(`bs_summary_lines_failed: ${lineErr.message}`);
  const lines = (lineRows ?? []) as SummaryLine[];

  const leftAmountCents = Number(artifact.assets_ending_cents);
  const rightAmountCents =
    Number(artifact.liabilities_ending_cents) +
    Number(artifact.equity_ending_cents);
  const varianceCents = Number(artifact.bs_equation_variance_cents);

  const includedTab: BackupTabSpec = {
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

  const perAccountTabs: BackupTabSpec[] = [];
  for (const line of lines) {
    const tabName = (line.qbo_account_name || "Account").slice(0, 28);
    if (line.is_computed_line || !line.child_run_id) {
      perAccountTabs.push({
        tabName,
        columns: [{ key: "note", label: "Note", format: "text" }],
        rows: [
          {
            note: "No transaction detail — computed from parent run rollup",
          },
        ],
      });
      continue;
    }
    const { data: txns } = await supabase
      .from("audit_ready_bs_recon_transactions")
      .select(
        "ordinal, txn_date, txn_type, doc_number, name_display, memo, debit_cents, credit_cents, net_cents",
      )
      .eq("run_id", line.child_run_id)
      .order("ordinal", { ascending: true });
    const txnList = (txns ?? []) as TxnRow[];
    if (txnList.length === 0) {
      perAccountTabs.push({
        tabName,
        columns: [{ key: "note", label: "Note", format: "text" }],
        rows: [
          {
            note: "No transaction detail — computed from parent run rollup",
          },
        ],
      });
      continue;
    }
    perAccountTabs.push({
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
    });
  }

  const sections = [
    {
      label: "Assets",
      amountCents: Number(artifact.assets_ending_cents),
      backupTabName: "Included Accounts",
    },
    {
      label: "Liabilities",
      amountCents: Number(artifact.liabilities_ending_cents),
      backupTabName: "Included Accounts",
    },
    {
      label: "Equity",
      amountCents: Number(artifact.equity_ending_cents),
      backupTabName: "Included Accounts",
    },
  ];
  const computed = lines.filter((l) => l.is_computed_line);
  for (const c of computed) {
    sections.push({
      label: c.qbo_account_name || "Computed",
      amountCents: Number(c.ending_balance_cents),
      backupTabName: "Included Accounts",
    });
  }

  return {
    face: {
      leftLabel: "Sum of Included Accounts",
      leftAmountCents,
      rightLabel: "QBO Balance Sheet",
      rightAmountCents,
      varianceCents,
      toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
      tieStatus: mapTotalsToTieStatus(
        artifact.bs_equation_status === "kickout"
          ? "kickout"
          : ctx.totalsStatus,
      ),
      sections,
      engagementName: ctx.engagementName,
      engagementId: ctx.engagementId,
      periodEnd: artifact.period_end || ctx.periodEnd,
      tieOutKind: "bs_recon_summary",
      runId,
      generatedAt: ctx.completedAt ?? new Date().toISOString(),
    },
    backupTabs: [includedTab, ...perAccountTabs],
    sourceData: sourceDataFromPayload(ctx.rawQboPayload),
  };
}

export const bsSummaryEmitter: WorkpaperEmitter = {
  kind: "bs_recon_summary",
  build: buildBsSummaryPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
