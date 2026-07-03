// D6.4b: Book an AP accrual. Composes a balanced JE with per-line evidence,
// prepares the manifest payload, and returns both for the caller to post +
// persist. Pure up to composition — does not touch je_post_attempts or
// company_memory_records directly.
import type { JeCompositionResult, JeLineWithEvidence } from "../je-evidence/types";
import { validateJeComposition } from "../je-evidence/contract";
import { canonicalizeVendorName, canonicalizeInvoiceNumber } from "./canonicalize";
import {
  AP_ACCRUAL_MANIFEST_SCHEMA_VERSION,
  type ApAccrualManifestLine,
  type ApAccrualManifestPayload,
} from "./manifest-schema";

export interface AccrualLineInput {
  vendorName: string;
  vendorId?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  expenseAccountId: string;
  expenseAccountName: string;
  memo?: string | null;
}

export interface BookApAccrualInput {
  firmClientId: string;
  companyId: string;
  closePeriodId: string;
  periodStart: string;
  periodEnd: string;
  transactionDate: string;
  accruedApAccountId: string;
  accruedApAccountName: string;
  narration: string;
  bookedByUserId: string | null;
  lines: AccrualLineInput[];
}

export interface BookApAccrualResult {
  composition: JeCompositionResult;
  manifestPayloadDraft: Omit<ApAccrualManifestPayload, "bookedAttemptId" | "bookedAt">;
}

export function composeApAccrual(input: BookApAccrualInput): BookApAccrualResult {
  if (!input.lines || input.lines.length === 0) {
    throw new Error("composeApAccrual: at least one line required");
  }
  const totalAccrued = input.lines.reduce((s, l) => s + l.amount, 0);
  if (totalAccrued <= 0) {
    throw new Error("composeApAccrual: totalAccrued must be positive");
  }

  const jeLines: JeLineWithEvidence[] = [];
  const manifestLines: ApAccrualManifestLine[] = [];

  input.lines.forEach((line, i) => {
    if (line.amount <= 0) {
      throw new Error(`line ${i}: amount must be positive`);
    }
    const vc = canonicalizeVendorName(line.vendorName);
    const ic = canonicalizeInvoiceNumber(line.invoiceNumber);
    if (!vc || !ic) {
      throw new Error(`line ${i}: vendor and invoice_number required for accrual matching`);
    }
    const lineIndex = i;
    jeLines.push({
      lineIndex,
      accountId: line.expenseAccountId,
      accountName: line.expenseAccountName,
      drAmount: line.amount,
      crAmount: 0,
      memo: line.memo ?? `Accrual: ${line.vendorName} ${line.invoiceNumber}`,
      evidence: {
        evidenceType: "system_calculation",
        sourceType: "ap_accrual_booking",
        sourceId: null,
        sourceKey: {
          vendor_canonical: vc,
          invoice_number_canonical: ic,
          vendor_name_raw: line.vendorName,
          invoice_number_raw: line.invoiceNumber,
          invoice_date: line.invoiceDate,
          vendor_id: line.vendorId ?? null,
        },
        sourceAmount: line.amount,
        sourceDate: line.invoiceDate,
        evidenceSummary: `Accrue ${line.vendorName} invoice ${line.invoiceNumber} (${line.invoiceDate}) — $${line.amount.toFixed(2)}`,
        calculationNotes: `AP accrual booked at period-end. Vendor: ${line.vendorName} (canonical: ${vc}). Invoice #${line.invoiceNumber} (canonical: ${ic}) dated ${line.invoiceDate}. Amount: $${line.amount.toFixed(2)}. This line will be reversed automatically in the following period when the real vendor bill enters AP with matching (vendor_canonical, invoice_number_canonical).`,
        originatingRuleId: null,
        originatingFireId: null,
      },
    });

    manifestLines.push({
      lineIndex,
      vendorName: line.vendorName,
      vendorId: line.vendorId ?? null,
      vendorCanonical: vc,
      invoiceNumber: line.invoiceNumber,
      invoiceNumberCanonical: ic,
      invoiceDate: line.invoiceDate,
      amount: line.amount,
      expenseAccountId: line.expenseAccountId,
      expenseAccountName: line.expenseAccountName,
      accruedApAccountId: input.accruedApAccountId,
      accruedApAccountName: input.accruedApAccountName,
      memo: line.memo ?? null,
      matchStatus: "open",
      matchedBillId: null,
      matchedAt: null,
      reversedAttemptId: null,
    });
  });

  jeLines.push({
    lineIndex: input.lines.length,
    accountId: input.accruedApAccountId,
    accountName: input.accruedApAccountName,
    drAmount: 0,
    crAmount: totalAccrued,
    memo: `Accrued AP — ${input.lines.length} invoice${input.lines.length === 1 ? "" : "s"}`,
    evidence: {
      evidenceType: "system_calculation",
      sourceType: "ap_accrual_booking",
      sourceId: null,
      sourceKey: {
        line_count: input.lines.length,
        close_period_id: input.closePeriodId,
      },
      sourceAmount: totalAccrued,
      sourceDate: input.transactionDate,
      evidenceSummary: `Credit to Accrued AP for ${input.lines.length} accrual line${input.lines.length === 1 ? "" : "s"}, total $${totalAccrued.toFixed(2)}`,
      calculationNotes: `Sum of ${input.lines.length} accrual lines: ${input.lines
        .map((l) => `${l.vendorName}/${l.invoiceNumber}=$${l.amount.toFixed(2)}`)
        .join("; ")}. Total = $${totalAccrued.toFixed(2)}.`,
      originatingRuleId: null,
      originatingFireId: null,
    },
  });

  const composition: JeCompositionResult = {
    transactionDate: input.transactionDate,
    narration: input.narration,
    sourceType: "accrual_booking",
    sourceId: input.closePeriodId,
    lines: jeLines,
  };

  validateJeComposition(composition);

  const manifestPayloadDraft: Omit<ApAccrualManifestPayload, "bookedAttemptId" | "bookedAt"> = {
    schemaVersion: AP_ACCRUAL_MANIFEST_SCHEMA_VERSION,
    firmClientId: input.firmClientId,
    companyId: input.companyId,
    closePeriodId: input.closePeriodId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    bookedByUserId: input.bookedByUserId,
    totalAccrued,
    accruedApAccountId: input.accruedApAccountId,
    accruedApAccountName: input.accruedApAccountName,
    lines: manifestLines,
  };

  return { composition, manifestPayloadDraft };
}
