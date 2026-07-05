/**
 * D-Assertions Part 5 — Resolve a close_gap_review_items row.
 *
 * Called by POST /api/reviewer/gap-items/[id]/resolve.
 * Validates the resolution type + payload, writes the row, emits a ledger event,
 * and triggers a targeted single-pair recompute so the coverage row reflects
 * the resolution immediately.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GapReviewItemRow,
  GapResolutionType,
} from "@/lib/pre-close/assertions-coverage-types";
import { publishEvent } from "@/lib/events/publisher";

export class GapResolveError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GapResolveError";
  }
}

export interface ResolveGapInput {
  resolutionType: GapResolutionType;
  resolutionMetadata: Record<string, unknown>;
  resolvedByUserId: string;
}

export function validateResolutionMetadata(
  type: GapResolutionType,
  md: Record<string, unknown>,
): { ok: true } | { ok: false; reason: string } {
  const nonEmpty = (v: unknown): v is string =>
    typeof v === "string" && v.trim().length > 0;
  switch (type) {
    case "manual_test":
      if (!nonEmpty(md.manual_test_ref))
        return { ok: false, reason: "manual_test_ref required (non-empty string)" };
      if (!nonEmpty(md.rationale))
        return { ok: false, reason: "rationale required (non-empty string)" };
      return { ok: true };
    case "rule_activation":
      if (!nonEmpty(md.activated_rule_id))
        return { ok: false, reason: "activated_rule_id required" };
      return { ok: true };
    case "not_applicable_override":
      if (!nonEmpty(md.rationale))
        return { ok: false, reason: "rationale required for N/A override" };
      return { ok: true };
    case "deferred_to_next_period":
      if (!nonEmpty(md.defer_reason))
        return { ok: false, reason: "defer_reason required" };
      return { ok: true };
    default:
      return { ok: false, reason: `unknown resolution_type: ${type as string}` };
  }
}

const RESOLUTION_STATUS_BY_TYPE: Record<GapResolutionType, string> = {
  manual_test: "resolved_remediated",
  rule_activation: "resolved_remediated",
  not_applicable_override: "resolved_not_applicable",
  deferred_to_next_period: "resolved_deferred",
};

export async function resolveGapReviewItem(
  db: SupabaseClient,
  gapItemId: string,
  input: ResolveGapInput,
): Promise<GapReviewItemRow> {
  const validation = validateResolutionMetadata(
    input.resolutionType,
    input.resolutionMetadata,
  );
  if (!validation.ok) {
    throw new GapResolveError(`invalid_resolution_metadata: ${validation.reason}`);
  }

  const { data: existing, error: exErr } = await db
    .from("close_gap_review_items")
    .select("*")
    .eq("id", gapItemId)
    .maybeSingle();
  if (exErr) throw new GapResolveError("fetch_failed", exErr);
  if (!existing) throw new GapResolveError("not_found");
  if (existing.resolution_status !== "open")
    throw new GapResolveError(
      `already_resolved: ${existing.resolution_status as string}`,
    );

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await db
    .from("close_gap_review_items")
    .update({
      resolution_status: RESOLUTION_STATUS_BY_TYPE[input.resolutionType],
      resolution_type: input.resolutionType,
      resolution_metadata: input.resolutionMetadata,
      resolved_by_user_id: input.resolvedByUserId,
      resolved_at: now,
    })
    .eq("id", gapItemId)
    .select("*")
    .single();
  if (updErr) throw new GapResolveError("update_failed", updErr);

  await publishEvent({
    eventType: "gap_review_item.resolved",
    eventCategory: "assertion",
    firmClientId: existing.firm_client_id as string,
    engagementId: existing.engagement_id as string,
    aggregateType: "close_gap_review_item",
    aggregateId: gapItemId,
    actorType: "user",
    payload: {
      resolution_type: input.resolutionType,
      resolution_metadata: input.resolutionMetadata,
      resolved_by_user_id: input.resolvedByUserId,
      account_category: existing.account_category,
      assertion_id: existing.assertion_id,
    },
  });

  return rowToGapReviewItem(updated);
}

export function rowToGapReviewItem(row: Record<string, unknown>): GapReviewItemRow {
  return {
    id: row.id as string,
    firmClientId: row.firm_client_id as string,
    engagementId: row.engagement_id as string,
    closePeriodId: row.close_period_id as string,
    accountCategory: row.account_category as GapReviewItemRow["accountCategory"],
    assertionId: row.assertion_id as GapReviewItemRow["assertionId"],
    gapRootCauseCode: row.gap_root_cause_code as GapReviewItemRow["gapRootCauseCode"],
    gapRecommendation: (row.gap_recommendation as string | null) ?? null,
    relevanceAtDetection: row.relevance_at_detection as "relevant" | "usually_not_primary",
    severity: row.severity as "critical" | "warning" | "info",
    resolutionStatus: row.resolution_status as GapReviewItemRow["resolutionStatus"],
    resolutionType: (row.resolution_type as GapReviewItemRow["resolutionType"]) ?? null,
    resolutionMetadata: (row.resolution_metadata as Record<string, unknown>) ?? {},
    resolvedByUserId: (row.resolved_by_user_id as string | null) ?? null,
    resolvedAt: (row.resolved_at as string | null) ?? null,
    resolutionStatusPrior: (row.resolution_status_prior as string | null) ?? null,
    reopenedAt: (row.reopened_at as string | null) ?? null,
    firstDetectedAt: row.first_detected_at as string,
    lastProjectedAt: row.last_projected_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
