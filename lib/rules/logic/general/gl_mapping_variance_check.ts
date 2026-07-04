/**
 * @rule       gen.gl_mapping_variance_check
 * @assertions primary:classification | secondary:presentation_disclosure
 * @accounts   operating_expenses, cost_of_goods_sold, revenue
 * @citation   ISA 315 ¶A190
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
import { queryMemory } from "@/lib/memory/client-memory-service";

export const RULE_ID = "gen.gl_mapping_variance_check";
export const RULE_VERSION = 1;

const MIN_CONFIDENCE = 0.75;
const MIN_SAMPLES = 3;

// D6.2a drift reconciliation: the real vendor_gl_mapping payload (written by
// lib/learning/accumulators/vendor-gl-accumulator.ts) stores ONE record per
// (vendor, account) pair with keys { vendor_id, account_id, sample_count,
// matching_count, confidence }. There is no single "learned_gl_account_id"
// field — the learned/expected GL is the vendor's highest-confidence
// account_id. queryMemory sorts by confidence DESC, so the first record for the
// vendor is the dominant mapping. sample_count is the vendor's total
// observation count, used as the history gate.
interface VendorGLMappingPayload {
  vendor_id?: string;
  account_id?: string;
  sample_count?: number;
  matching_count?: number;
  confidence?: number;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  const vendorId = ctx.inputs.vendorId as string | undefined;
  const actualGL = ctx.inputs.actualGLAccountId as string | undefined;
  if (!vendorId || !actualGL) {
    return {
      fired: false,
      outcome: "suppressed",
      reason_code: "missing_inputs",
      reason_detail: { hasVendorId: !!vendorId, hasActualGL: !!actualGL },
    };
  }
  try {
    const records = await queryMemory({
      firmClientId: ctx.firmClientId,
      memoryType: "vendor_gl_mapping",
      entityType: "vendor",
      entityId: vendorId,
      minConfidence: MIN_CONFIDENCE,
    });

    if (records.length === 0) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "no_learned_pattern",
        reason_detail: { vendorId },
      };
    }

    // Highest-confidence record = the learned/dominant mapping (sorted DESC).
    const top = records[0];
    const payload = (top.payload ?? {}) as VendorGLMappingPayload;
    const learnedGL = payload.account_id;
    const sampleCount = payload.sample_count ?? payload.matching_count ?? 0;

    if (!learnedGL) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "learned_gl_missing_in_payload",
        reason_detail: { vendorId, memoryId: top.memory_id ?? null },
      };
    }

    if (sampleCount < MIN_SAMPLES) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "insufficient_history",
        reason_detail: { vendorId, sampleCount, minSamples: MIN_SAMPLES },
      };
    }

    if (learnedGL === actualGL) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "mapping_matches",
        reason_detail: { vendorId, learnedGL, actualGL },
      };
    }

    return {
      fired: true,
      outcome: "fired",
      reason_code: "gl_mapping_variance",
      reason_detail: {
        vendorId,
        learnedGL,
        actualGL,
        sampleCount,
        confidence: top.confidence_score ?? null,
        memoryRecordId: top.memory_id ?? null,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      fired: false,
      outcome: "error",
      reason_code: "memory_query_failed",
      reason_detail: { message, vendorId },
    };
  }
}
