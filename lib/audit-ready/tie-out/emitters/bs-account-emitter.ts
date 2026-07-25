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
  beginning_balance_cents: number;
  ending_balance_cents: number;
  gl_ending_balance_cents: number;
  tie_variance_cents: number;
  qbo_account_name: string | null;
  period_start: string;
  period_end: string;
};

type TxnRow = {
  ordinal: number;
  txn_date: string | null;
  txn_type: string | null;
  doc_number: string | null;
  name_display: string | null;
  memo: string | null;
  split_account: string | null;
  debit_cents: number;
  credit_cents: number;
  net_cents: number;
  running_balance_cents: number | null;
};

function monthKey(date: string | null): string {
  if (!date || date.length < 7) return "Unknown";
  return date.slice(0, 7);
}

export async function buildBsAccountPayload(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "bs_account_recon") {
    throw new Error(`wrong_kind: expected bs_account_recon got ${ctx.tieOutKind}`);
  }
  const supabase = getSupabaseAdmin();
  const { data: art, error: artErr } = await supabase
    .from("audit_ready_bs_recon_artifacts")
    .select(
      "beginning_balance_cents, ending_balance_cents, gl_ending_balance_cents, tie_variance_cents, qbo_account_name, period_start, period_end",
    )
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (artErr || !art) {
    throw new Error(`bs_artifact_not_found: ${artErr?.message ?? runId}`);
  }
  const artifact = art as ArtifactRow;
  const { data: txns, error: txnErr } = await supabase
    .from("audit_ready_bs_recon_transactions")
    .select(
      "ordinal, txn_date, txn_type, doc_number, name_display, memo, split_account, debit_cents, credit_cents, net_cents, running_balance_cents",
    )
    .eq("run_id", runId)
    .order("ordinal", { ascending: true });
  if (txnErr) throw new Error(`bs_txn_query_failed: ${txnErr.message}`);
  const rows = (txns ?? []) as TxnRow[];

  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const k = monthKey(r.txn_date);
    byMonth.set(k, (byMonth.get(k) ?? 0) + Number(r.net_cents));
  }

  const leftAmountCents = Number(artifact.ending_balance_cents);
  const rightAmountCents = Number(artifact.gl_ending_balance_cents);
  const varianceCents = Number(artifact.tie_variance_cents);
  const backupName = "Activity Detail";

  const sections = [
    {
      label: "Beginning Balance",
      amountCents: Number(artifact.beginning_balance_cents),
      backupTabName: backupName,
    },
    ...Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, cents]) => ({
        label: `Activity ${ym}`,
        amountCents: cents,
        backupTabName: backupName,
      })),
    {
      label: "Ending Balance",
      amountCents: leftAmountCents,
      backupTabName: backupName,
    },
  ];

  const activityTab: BackupTabSpec = {
    tabName: backupName,
    columns: [
      { key: "ordinal", label: "Ordinal", format: "number" },
      { key: "txn_date", label: "Date", format: "date" },
      { key: "txn_type", label: "Type", format: "text" },
      { key: "doc_number", label: "Doc #", format: "text" },
      { key: "name_display", label: "Name", format: "text" },
      { key: "memo", label: "Memo", format: "text" },
      { key: "split_account", label: "Split Account", format: "text" },
      { key: "debit_cents", label: "Debit", format: "currency" },
      { key: "credit_cents", label: "Credit", format: "currency" },
      { key: "net_cents", label: "Net", format: "currency" },
      { key: "running_balance_cents", label: "Running Balance", format: "currency" },
    ],
    rows: rows.map((r) => ({
      ordinal: r.ordinal,
      txn_date: r.txn_date,
      txn_type: r.txn_type,
      doc_number: r.doc_number,
      name_display: r.name_display,
      memo: r.memo,
      split_account: r.split_account,
      debit_cents: Number(r.debit_cents),
      credit_cents: Number(r.credit_cents),
      net_cents: Number(r.net_cents),
      running_balance_cents:
        r.running_balance_cents == null ? null : Number(r.running_balance_cents),
    })),
  };

  const toleranceCents = Math.round((ctx.kickoutMinDollar ?? 1) * 100);

  return {
    face: {
      leftLabel: "Prepared Schedule",
      leftAmountCents,
      rightLabel: "General Ledger",
      rightAmountCents,
      varianceCents,
      toleranceCents,
      tieStatus: mapTotalsToTieStatus(ctx.totalsStatus),
      sections,
      engagementName: ctx.engagementName,
      engagementId: ctx.engagementId,
      periodEnd: artifact.period_end || ctx.periodEnd,
      tieOutKind: "bs_account_recon",
      runId,
      generatedAt: ctx.completedAt ?? new Date().toISOString(),
      regeneratedFromRunId: ctx.regeneratedFromRunId,
      regeneratedAt: ctx.regeneratedAt,
    },
    backupTabs: [activityTab],
    sourceData: sourceDataFromPayload(ctx.rawQboPayload),
  };
}

export const bsAccountEmitter: WorkpaperEmitter = {
  kind: "bs_account_recon",
  build: buildBsAccountPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
