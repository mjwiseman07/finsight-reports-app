/**
 * Phase D6.5 Part 2 — Block 2: Bills handler with L1 vendor resolution.
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
    return {
      status: "success",
      detail: {
        partial: true,
        signals: outcome.signals,
        text: textResult,
        fingerprint_deferred: true,
        bill_id: billId,
        vendor_resolution: { method: outcome.method },
      },
    };
  }

  if (outcome.method === "fuzzy_candidate") {
    return {
      status: "success",
      detail: {
        partial: true,
        signals: [
          ...outcome.signals,
          {
            code: "fuzzy_candidates_pending_review",
            severity: "INFO",
            evidence: {
              candidate_ids: outcome.candidate_ids,
              confidence: outcome.confidence,
            },
          },
        ],
        text: textResult,
        fingerprint_deferred: true,
        bill_id: billId,
        vendor_resolution: {
          method: outcome.method,
          candidate_ids: outcome.candidate_ids,
          confidence: outcome.confidence,
        },
      },
    };
  }

  const vendorId = outcome.resolved_vendor_id as string;
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

  const signals: Array<Record<string, unknown>> = [...outcome.signals];
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

  return {
    status: "success",
    detail: {
      signals,
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
