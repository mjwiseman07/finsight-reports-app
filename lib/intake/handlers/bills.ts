/**
 * Phase D6.5 Part 2 — Block 4: Bills handler with L1 vendor + L3 bank change + L5 duplicate detection.
 */
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import {
  computeDrift,
  EXTRACTOR_VERSION,
  fingerprintExtract,
  type FingerprintPayload,
} from "@/lib/ap-intake/fingerprint/extractor";
import {
  acceptsBillsMime,
  extractBillText,
  renderFirstPageRaster,
  type BillTextExtractionResult,
} from "@/lib/ap-intake/bills/helpers";
import { resolveVendor, type VendorResolutionOutcome } from "@/lib/ap-intake/vendor/resolver";
import { extractRemittance } from "@/lib/ap-intake/l3/remittance-extractor";
import { detectBankChange } from "@/lib/ap-intake/l3/bank-change-detector";
import { quarantineBill } from "@/lib/ap-intake/quarantine/quarantine-service";
import { extractInvoiceFields } from "@/lib/ap-intake/duplicate/invoice-extractor";
import { computeContentHash } from "@/lib/ap-intake/duplicate/content-hash";
import { detectDuplicates } from "@/lib/ap-intake/duplicate/detector";
import { detectAnomalies } from "@/lib/ap-intake/anomaly/detector";
import { aggregateFraudScore } from "@/lib/ap-intake/scoring/aggregator";
import type { ContributingSignal, ScoreSeverity } from "@/lib/ap-intake/scoring/schema";
import { writeBillHistoryRow } from "@/lib/ap-intake/history/bill-history-writer";
import type {
  IntakeHandler,
  IntakeHandlerContext,
  IntakeHandlerOutcome,
} from "@/lib/intake/types";

async function resolveEngagementId(
  ctx: IntakeHandlerContext,
): Promise<string | null> {
  const { data } = await ctx.supabase
    .from("engagements")
    .select("id")
    .eq("firm_id", ctx.message.firm_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function nextFingerprintVersion(
  ctx: IntakeHandlerContext,
  vendorId: string,
): Promise<number> {
  const { data } = await ctx.supabase
    .from("vendor_invoice_fingerprints")
    .select("version")
    .eq("firm_id", ctx.message.firm_id)
    .eq("vendor_id", vendorId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.version ?? 0) + 1;
}

async function fetchPriorFingerprint(
  ctx: IntakeHandlerContext,
  vendorId: string,
  version: number,
): Promise<FingerprintPayload | null> {
  const { data } = await ctx.supabase
    .from("vendor_invoice_fingerprints")
    .select("*")
    .eq("firm_id", ctx.message.firm_id)
    .eq("vendor_id", vendorId)
    .eq("version", version)
    .maybeSingle();
  if (!data) return null;
  return {
    layout_bboxes: data.layout_bboxes,
    font_families: data.font_families,
    color_palette: data.color_palette,
    phash: Buffer.from(data.phash),
    dhash: Buffer.from(data.dhash),
    extractor_version: data.extractor_version,
  };
}

async function persistFingerprint(
  ctx: IntakeHandlerContext,
  row: {
    vendor_id: string;
    version: number;
    bill_id: string | null;
    provenance: "live_intake" | "onboarding_harvest";
    fp: FingerprintPayload;
  },
): Promise<void> {
  const { error } = await ctx.supabase.from("vendor_invoice_fingerprints").insert({
    firm_id: ctx.message.firm_id,
    vendor_id: row.vendor_id,
    version: row.version,
    bill_id: row.bill_id,
    provenance: row.provenance,
    layout_bboxes: row.fp.layout_bboxes,
    font_families: row.fp.font_families,
    color_palette: row.fp.color_palette,
    phash: row.fp.phash,
    dhash: row.fp.dhash,
    extractor_version: row.fp.extractor_version,
  });
  if (error) throw new Error(error.message);
}

async function persistBillRow(
  ctx: IntakeHandlerContext,
  text: BillTextExtractionResult,
  outcome: VendorResolutionOutcome,
): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("ap_intake_bills")
    .insert({
      firm_id: ctx.message.firm_id,
      company_id: ctx.message.company_id,
      firm_client_id: ctx.message.firm_client_id,
      intake_message_id: ctx.message.id,
      resolved_vendor_id: outcome.resolved_vendor_id,
      mime_type: text.mime_type,
      raw_text: text.raw_text,
      vendor_resolution_method: outcome.method,
      vendor_resolution_confidence: outcome.confidence,
      vendor_candidate_ids: outcome.candidate_ids,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "ap_intake_bills insert failed");
  return data.id as string;
}

export async function handleBills(ctx: IntakeHandlerContext): Promise<IntakeHandlerOutcome> {
  const engagementId = await resolveEngagementId(ctx);
  await assertEntitlement("ap_intake", engagementId, {
    caller: "bills_handler",
    firmClientId: ctx.message.firm_client_id ?? undefined,
  });

  const billAtt = ctx.attachments.find((a) => acceptsBillsMime(a.content_type));
  if (!billAtt && ctx.attachments.length > 0) {
    return {
      status: "skipped_not_applicable",
      reason: "unsupported_mime",
    };
  }

  const textResult = extractBillText(ctx.message, ctx.attachments);
  const outcome = await resolveVendor(ctx, textResult.raw_text);
  const billId = await persistBillRow(ctx, textResult, outcome);
  textResult.bill_id = billId;

  if (outcome.method === "no_match") {
    const { quarantineId } = await quarantineBill({
      supabase: ctx.supabase,
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? "",
      billId,
      intakeMessageId: ctx.message.id,
      reason: "no_match",
      originatingSignals: outcome.signals as Array<{
        code: string;
        severity: string;
        evidence: unknown;
      }>,
      originatingSeverity: "HIGH",
    });
    return {
      status: "success",
      detail: {
        partial: true,
        signals: outcome.signals,
        text: textResult,
        fingerprint_deferred: true,
        bill_id: billId,
        quarantine_id: quarantineId,
        vendor_resolution: { method: outcome.method },
      },
    };
  }

  if (outcome.method === "fuzzy_candidate") {
    const fuzzySignals = [
      ...outcome.signals,
      {
        code: "fuzzy_candidates_pending_review",
        severity: "INFO",
        evidence: {
          candidate_ids: outcome.candidate_ids,
          confidence: outcome.confidence,
        },
      },
    ];
    const { quarantineId } = await quarantineBill({
      supabase: ctx.supabase,
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? "",
      billId,
      intakeMessageId: ctx.message.id,
      reason: "fuzzy_candidate",
      originatingSignals: fuzzySignals as Array<{
        code: string;
        severity: string;
        evidence: unknown;
      }>,
      originatingSeverity: "HIGH",
    });
    return {
      status: "success",
      detail: {
        partial: true,
        signals: fuzzySignals,
        text: textResult,
        fingerprint_deferred: true,
        bill_id: billId,
        quarantine_id: quarantineId,
        vendor_resolution: {
          method: outcome.method,
          candidate_ids: outcome.candidate_ids,
          confidence: outcome.confidence,
        },
      },
    };
  }

  const vendorId = outcome.resolved_vendor_id as string;

  const extractedRemittance = extractRemittance(textResult.raw_text);
  const bankResult = await detectBankChange({
    supabase: ctx.supabase,
    firmId: ctx.message.firm_id,
    firmClientId: ctx.message.firm_client_id ?? "",
    vendorId,
    billId,
    extracted: extractedRemittance,
    actorUserId: null,
  });

  if (bankResult.changed) {
    const bankSignals = bankResult.signals.map((s) => ({
      code: s.code,
      severity: s.severity,
      evidence: s.evidence,
    }));
    const { quarantineId } = await quarantineBill({
      supabase: ctx.supabase,
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? "",
      billId,
      intakeMessageId: ctx.message.id,
      reason: "bank_change_detected",
      originatingSignals: bankSignals,
      originatingSeverity: "HIGH",
    });
    return {
      status: "success",
      detail: {
        partial: true,
        signals: [...outcome.signals, ...bankSignals],
        text: textResult,
        fingerprint_deferred: true,
        bill_id: billId,
        quarantine_id: quarantineId,
        vendor_resolution: { method: outcome.method },
        bank_change: {
          changed: true,
          prior_hash: bankResult.prior_hash,
          current_hash: bankResult.current_hash,
        },
      },
    };
  }

  const invoiceFields = extractInvoiceFields(textResult.raw_text);
  const contentHash = computeContentHash(textResult.raw_text);
  await ctx.supabase
    .from("ap_intake_bills")
    .update({
      invoice_number: invoiceFields.invoice_number,
      invoice_date: invoiceFields.invoice_date,
      invoice_amount_cents: invoiceFields.invoice_amount_cents,
      content_hash_sha256: contentHash,
    })
    .eq("id", billId);

  const dupResult = await detectDuplicates({
    supabase: ctx.supabase,
    firmId: ctx.message.firm_id,
    firmClientId: ctx.message.firm_client_id ?? "",
    vendorId,
    billId,
    contentHash,
    invoiceNumber: invoiceFields.invoice_number,
    invoiceDate: invoiceFields.invoice_date,
    invoiceAmountCents: invoiceFields.invoice_amount_cents,
  });

  if (dupResult.shouldQuarantine) {
    await aggregateFraudScore({
      supabase: ctx.supabase,
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? "",
      billId,
      signals: [
        ...bankResult.signals
          .filter((s) => s.severity === "HIGH")
          .map((s) => ({
            layer: "L3" as const,
            code: s.code,
            severity: s.severity as "HIGH" | "MEDIUM",
            evidence: s.evidence as Record<string, unknown>,
          })),
        ...dupResult.signals.map((s) => ({
          layer: "L5" as const,
          code: s.code,
          severity: s.severity as "HIGH" | "MEDIUM",
          evidence: (s.evidence ?? {}) as Record<string, unknown>,
        })),
      ],
    });
    await writeBillHistoryRow({
      supabase: ctx.supabase,
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? "",
      vendorId,
      billId,
      invoiceAmountCents: invoiceFields.invoice_amount_cents,
      invoiceDate: invoiceFields.invoice_date,
      invoiceNumber: invoiceFields.invoice_number,
      receivedAt: ctx.message.received_at ?? new Date().toISOString(),
      quarantined: true,
    });

    const { quarantineId } = await quarantineBill({
      supabase: ctx.supabase,
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? "",
      billId,
      intakeMessageId: ctx.message.id,
      reason: "multi_signal",
      originatingSignals: dupResult.signals,
      originatingSeverity: "HIGH",
    });
    return {
      status: "success",
      detail: {
        partial: true,
        signals: [...outcome.signals, ...dupResult.signals],
        text: textResult,
        fingerprint_deferred: true,
        bill_id: billId,
        quarantine_id: quarantineId,
        vendor_resolution: { method: outcome.method },
        duplicate_detection: {
          hit_count: dupResult.hits.length,
          high_severity_count: dupResult.highSeverityHits.length,
        },
      },
    };
  }

  const pageImage = await renderFirstPageRaster(ctx.message, ctx.attachments);
  const fp = await fingerprintExtract(pageImage, ctx.message.firm_client_id ?? "");

  const version = await nextFingerprintVersion(ctx, vendorId);
  const prior =
    version > 1 ? await fetchPriorFingerprint(ctx, vendorId, version - 1) : null;

  await persistFingerprint(ctx, {
    vendor_id: vendorId,
    version,
    bill_id: billId,
    provenance: "live_intake",
    fp,
  });

  const signals: Array<{ code: string; severity: string; evidence: unknown }> = [
    ...outcome.signals,
    ...bankResult.signals.map((s) => ({
      code: s.code,
      severity: s.severity,
      evidence: s.evidence,
    })),
    ...dupResult.signals,
  ];
  let drift_from_prior = null;
  if (prior) {
    const drift = computeDrift(prior, fp);
    drift_from_prior = drift;
    if (!drift.within_threshold) {
      signals.push({
        code: "fingerprint_drift_exceeded",
        severity: "HIGH",
        evidence: drift,
      });
    }
  }

  await publishEvent(
    {
      eventType: "fingerprint.new_version_created",
      eventCategory: "ap",
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? undefined,
      aggregateType: "vendor_invoice_fingerprint",
      aggregateId: `${vendorId}:v${version}`,
      actorType: "system",
      payload: {
        vendor_id: vendorId,
        version,
        bill_id: billId,
        extractor_version: EXTRACTOR_VERSION,
        drift_from_prior,
      },
    },
    ctx.supabase,
  );

  const invoiceAmountCents = invoiceFields.invoice_amount_cents;
  const anomalyResult = await detectAnomalies({
    supabase: ctx.supabase,
    firmId: ctx.message.firm_id,
    firmClientId: ctx.message.firm_client_id ?? "",
    vendorId,
    billId,
    invoiceAmountCents,
    receivedAt: ctx.message.received_at ?? new Date().toISOString(),
    approvalThresholdCents: null,
  });

  const contributingSignals: ContributingSignal[] = [
    ...bankResult.signals
      .filter((s) => s.severity === "HIGH")
      .map((s) => ({
        layer: "L3" as const,
        code: s.code,
        severity: s.severity as ScoreSeverity,
        evidence: s.evidence as Record<string, unknown>,
      })),
    ...(drift_from_prior &&
    !(drift_from_prior as { within_threshold?: boolean }).within_threshold
      ? [
          {
            layer: "L4" as const,
            code: "fingerprint_drift_exceeded",
            severity: "HIGH" as const,
            evidence: drift_from_prior as unknown as Record<string, unknown>,
          },
        ]
      : []),
    ...dupResult.signals.map((s) => ({
      layer: "L5" as const,
      code: s.code,
      severity: s.severity as ScoreSeverity,
      evidence: (s.evidence ?? {}) as Record<string, unknown>,
    })),
    ...anomalyResult.signals.map((s) => ({
      layer: "L6" as const,
      code: s.code,
      severity: s.severity as ScoreSeverity,
      evidence: s.evidence,
    })),
  ];

  const aggregated = await aggregateFraudScore({
    supabase: ctx.supabase,
    firmId: ctx.message.firm_id,
    firmClientId: ctx.message.firm_client_id ?? "",
    billId,
    signals: contributingSignals,
  });

  if (aggregated.quarantine_recommended) {
    const { quarantineId } = await quarantineBill({
      supabase: ctx.supabase,
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? "",
      billId,
      intakeMessageId: ctx.message.id,
      reason: "fraud_score_threshold",
      originatingSignals: contributingSignals.map((s) => ({
        code: s.code,
        severity: s.severity,
        evidence: s.evidence,
      })),
      originatingSeverity: "HIGH",
    });
    await writeBillHistoryRow({
      supabase: ctx.supabase,
      firmId: ctx.message.firm_id,
      firmClientId: ctx.message.firm_client_id ?? "",
      vendorId,
      billId,
      invoiceAmountCents,
      invoiceDate: invoiceFields.invoice_date,
      invoiceNumber: invoiceFields.invoice_number,
      receivedAt: ctx.message.received_at ?? new Date().toISOString(),
      quarantined: true,
    });
    return {
      status: "success",
      detail: {
        partial: true,
        signals: [...signals, ...anomalyResult.signals],
        text: textResult,
        bill_id: billId,
        quarantine_id: quarantineId,
        fingerprint_version: version,
        vendor_resolution: { method: outcome.method },
        fraud_score_threshold: {
          score: aggregated.score,
          contributions: aggregated.contributions,
        },
      },
    };
  }

  await writeBillHistoryRow({
    supabase: ctx.supabase,
    firmId: ctx.message.firm_id,
    firmClientId: ctx.message.firm_client_id ?? "",
    vendorId,
    billId,
    invoiceAmountCents,
    invoiceDate: invoiceFields.invoice_date,
    invoiceNumber: invoiceFields.invoice_number,
    receivedAt: ctx.message.received_at ?? new Date().toISOString(),
    quarantined: false,
  });

  return {
    status: "success",
    detail: {
      signals: [...signals, ...anomalyResult.signals],
      text: textResult,
      fingerprint_version: version,
      bill_id: billId,
      vendor_resolution: { method: outcome.method },
    },
  };
}

export const billsHandler: IntakeHandler = {
  key: "bills",
  requiredEntitlement: "ap_intake",
  handle: handleBills,
};
