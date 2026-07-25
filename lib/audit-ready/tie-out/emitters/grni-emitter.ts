import type {
  BackupTabSpec,
  WorkpaperEmitter,
  WorkpaperPayload,
} from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { emitWorkpaperPdf, emitWorkpaperXlsx } from "./_shared/emit-common";
import {
  loadEvidence,
  loadRunContext,
  sourceDataFromPayload,
  type EvidenceRow,
} from "./_shared/load-run";
import { formatIsoDate } from "./_shared/format";

type UnbilledBill = {
  bill_id: string;
  txn_date: string;
  vendor_ref: string | null;
  vendor_display_name: string | null;
  subtotal_cents: number;
  doc_number: string | null;
  linked_po_ids: string[];
};

export async function buildGrniPayload(
  runId: string,
): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  if (ctx.tieOutKind !== "grni") {
    throw new Error(`wrong_kind: expected grni got ${ctx.tieOutKind}`);
  }
  const evidence = await loadEvidence(runId);
  const evByBill = new Map<string, EvidenceRow>(
    evidence.map((e) => [e.source_qbo_id ?? "", e]),
  );

  const raw = ctx.rawQboPayload;
  const unbilled =
    (raw?.unbilled_bills as { bills?: UnbilledBill[]; total_cents?: number }) ??
    {};
  const bills = unbilled.bills ?? [];
  const totalCents =
    ctx.subledgerTotalCents ?? unbilled.total_cents ?? 0;

  // Backup 1 — Open Unbilled Bills Detail (bill × evidence join).
  const billsDetail: BackupTabSpec = {
    tabName: "Open Unbilled Bills Detail",
    columns: [
      { key: "bill_date", label: "Bill Date", format: "date" },
      { key: "vendor", label: "Vendor", format: "text" },
      { key: "bill_no", label: "Bill #", format: "text" },
      { key: "amount", label: "Amount", format: "currency" },
      { key: "aging_bucket", label: "Aging Bucket", format: "text" },
      { key: "age_days", label: "Age (Days)", format: "number" },
      { key: "linked_pos", label: "Linked POs", format: "text" },
    ],
    rows: bills.map((b) => {
      const ev = evByBill.get(b.bill_id);
      return {
        bill_date: formatIsoDate(b.txn_date),
        vendor: b.vendor_display_name ?? b.vendor_ref ?? "",
        bill_no: b.doc_number ?? "",
        amount: Number(b.subtotal_cents),
        aging_bucket: ev?.aging_bucket ?? "",
        age_days: ev?.age_days_at_run ?? null,
        linked_pos: (b.linked_po_ids ?? []).join(", "),
      };
    }),
    subtotalRow: {
      bill_date: null,
      vendor: "TOTAL",
      bill_no: null,
      amount: totalCents,
      aging_bucket: null,
      age_days: null,
      linked_pos: null,
    },
  };

  // Backup 2 — Vendor Rollup.
  const byVendor = new Map<
    string,
    { ref: string | null; name: string; count: number; total: number }
  >();
  for (const b of bills) {
    const key = b.vendor_ref ?? b.vendor_display_name ?? "(unknown)";
    const existing = byVendor.get(key) ?? {
      ref: b.vendor_ref,
      name: b.vendor_display_name ?? b.vendor_ref ?? "(unknown)",
      count: 0,
      total: 0,
    };
    existing.count += 1;
    existing.total += b.subtotal_cents;
    byVendor.set(key, existing);
  }
  const vendorRollup: BackupTabSpec = {
    tabName: "Vendor Rollup",
    columns: [
      { key: "vendor_ref", label: "Vendor Ref", format: "text" },
      { key: "vendor_name", label: "Vendor Name", format: "text" },
      { key: "bill_count", label: "Bill Count", format: "number" },
      { key: "total_open", label: "Total Open", format: "currency" },
    ],
    rows: [...byVendor.values()].map((v) => ({
      vendor_ref: v.ref,
      vendor_name: v.name,
      bill_count: v.count,
      total_open: v.total,
    })),
    subtotalRow: {
      vendor_ref: null,
      vendor_name: "TOTAL",
      bill_count: bills.length,
      total_open: totalCents,
    },
  };

  // Backup 3 — Aging by Receipt Age (from evidence aging_bucket).
  const byBucket = new Map<string, { count: number; total: number }>();
  for (const b of bills) {
    const ev = evByBill.get(b.bill_id);
    const bucket = ev?.aging_bucket ?? "unclassified";
    const existing = byBucket.get(bucket) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += b.subtotal_cents;
    byBucket.set(bucket, existing);
  }
  const agingRollup: BackupTabSpec = {
    tabName: "Aging by Receipt Age",
    columns: [
      { key: "bucket", label: "Bucket", format: "text" },
      { key: "bill_count", label: "Bill Count", format: "number" },
      { key: "total_amount", label: "Total Amount", format: "currency" },
    ],
    rows: [...byBucket.entries()].map(([bucket, v]) => ({
      bucket,
      bill_count: v.count,
      total_amount: v.total,
    })),
    subtotalRow: {
      bucket: "TOTAL",
      bill_count: bills.length,
      total_amount: totalCents,
    },
  };

  return {
    face: {
      mode: "report_only",
      leftLabel: "Open Unbilled Bills",
      leftAmountCents: totalCents,
      rightLabel: null,
      rightAmountCents: null,
      varianceCents: null,
      toleranceCents: Math.round((ctx.kickoutMinDollar ?? 1) * 100),
      tieStatus: "ties",
      sections: [
        {
          label: "Open Receipts",
          amountCents: totalCents,
          backupTabName: "Open Unbilled Bills Detail",
        },
      ],
      engagementName: ctx.engagementName,
      engagementId: ctx.engagementId,
      periodEnd: ctx.periodEnd,
      tieOutKind: "grni",
      runId,
      generatedAt: ctx.completedAt ?? new Date().toISOString(),
    },
    backupTabs: [billsDetail, vendorRollup, agingRollup],
    sourceData: sourceDataFromPayload(raw),
  };
}

export const grniEmitter: WorkpaperEmitter = {
  kind: "grni",
  build: buildGrniPayload,
  emitXlsx: emitWorkpaperXlsx,
  emitPdf: emitWorkpaperPdf,
};
