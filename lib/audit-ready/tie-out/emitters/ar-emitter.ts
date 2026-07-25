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

type AgingCustomer = {
  customer_ref: string | null;
  customer_display_name: string;
  total_cents: number;
};

export async function buildArPayload(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "ar_aging") {
    throw new Error(`wrong_kind: expected ar_aging got ${ctx.tieOutKind}`);
  }
  const variances = await loadVariances(runId);
  const totals = variances.find((v) => v.entity_kind === "totals");
  const custVars = variances.filter((v) => v.entity_kind === "customer");
  const byRef = new Map(custVars.map((v) => [v.entity_qbo_id ?? "", v]));

  const raw = ctx.rawQboPayload;
  const aging =
    (raw?.aging_detail as { customers?: AgingCustomer[]; total_cents?: number }) ??
    {};
  const customers = aging.customers ?? [];

  const leftAmountCents =
    totals?.subledger_amount_cents ?? aging.total_cents ?? 0;
  const rightAmountCents = totals?.gl_amount_cents ?? 0;
  const varianceCents = totals?.variance_cents ?? leftAmountCents - rightAmountCents;

  const rollup: BackupTabSpec = {
    tabName: "Customer Rollup",
    columns: [
      { key: "customer_ref", label: "Customer Ref", format: "text" },
      { key: "customer_name", label: "Customer Name", format: "text" },
      { key: "subledger_total", label: "Subledger Total", format: "currency" },
      { key: "variance_vs_gl", label: "Variance vs GL", format: "currency" },
      { key: "status", label: "Status", format: "text" },
    ],
    rows: customers.map((c) => {
      const cv = byRef.get(c.customer_ref ?? "");
      const isCredit = Number(c.total_cents) < 0;
      const status = cv
        ? cv.status === "review" && isCredit
          ? "review — credit balance"
          : cv.status
        : "not_applicable";
      return {
        customer_ref: c.customer_ref,
        customer_name: c.customer_display_name,
        subledger_total: Number(c.total_cents),
        variance_vs_gl: cv ? Number(cv.variance_cents) : 0,
        status,
      };
    }),
    subtotalRow: {
      customer_ref: null,
      customer_name: "TOTAL",
      subledger_total: leftAmountCents,
      variance_vs_gl: null,
      status: null,
    },
  };

  return {
    face: {
      mode: "two_sided",
      leftLabel: "AR Subledger",
      leftAmountCents,
      rightLabel: "GL AR Account",
      rightAmountCents,
      varianceCents,
      toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
      tieStatus: mapTotalsToTieStatus(totals?.status ?? ctx.totalsStatus),
      sections: [
        {
          label: "Customers",
          amountCents: leftAmountCents,
          backupTabName: "Customer Rollup",
        },
      ],
      engagementName: ctx.engagementName,
      engagementId: ctx.engagementId,
      periodEnd: ctx.periodEnd,
      tieOutKind: "ar_aging",
      runId,
      generatedAt: ctx.completedAt ?? new Date().toISOString(),
    },
    backupTabs: [rollup],
    sourceData: sourceDataFromPayload(raw),
  };
}

export const arEmitter: WorkpaperEmitter = {
  kind: "ar_aging",
  build: buildArPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
