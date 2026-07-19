/**
 * D6.4c-3 — Pre-post self-healing remediation pipeline.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { validateJeDraft } from "@/lib/pre-close/je-draft-validate";
import { validateJEPayload } from "@/lib/erp/quickbooks/je-validator";
import { convertJeDraftToJEPayload } from "@/lib/pre-close/je-draft-to-je-payload";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { POST_BLOCK_REASONS, type PostBlockReason } from "@/lib/pre-close/post-block-reasons";
import type { JEDraft } from "@/lib/pre-close/types";
import type { JEPayload } from "@/lib/erp/types";

const QBO_NARRATION_MAX = 4000;
const QBO_ACCOUNT_ID_PATTERN = /^\d+$/;

export interface RemediationContext {
  firmClientId: string;
  engagementId: string;
  reviewItemId: string;
}

export type RemediationResult =
  | { ok: true; payload: JEPayload; remediationsApplied: string[] }
  | { ok: false; reason: PostBlockReason; details?: unknown; remediationsApplied: string[] };

export async function runRemediationPipeline(
  draft: JEDraft,
  ctx: RemediationContext,
): Promise<RemediationResult> {
  const remediationsApplied: string[] = [];
  let workingDraft: JEDraft = { ...draft, lines: draft.lines.map((l) => ({ ...l })) };

  const stage1 = validateJeDraft(workingDraft);
  if (!stage1.ok) {
    return {
      ok: false,
      reason: mapDraftValidatorReasonToBlockCode(stage1.reason),
      details: { stage: "local_validate", validator_reason: stage1.reason },
      remediationsApplied,
    };
  }

  const remap = await remapAccountIds(workingDraft, ctx);
  if (remap.applied) {
    workingDraft = remap.draft;
    remediationsApplied.push("account_id_remap");
    await logRemediation(ctx, "account_id_remap", remap.mappings);
  } else if (remap.unresolvable) {
    return {
      ok: false,
      reason: POST_BLOCK_REASONS.ACCOUNT_MAPPING_UNRESOLVED,
      details: { unresolved_lines: remap.unresolvedLines },
      remediationsApplied,
    };
  }

  if (workingDraft.narration && workingDraft.narration.length > QBO_NARRATION_MAX) {
    workingDraft = {
      ...workingDraft,
      narration: workingDraft.narration.slice(0, QBO_NARRATION_MAX - 3) + "...",
    };
    remediationsApplied.push("narration_truncated");
    await logRemediation(ctx, "narration_truncated", { original_len: draft.narration?.length });
  }

  const dateShift = await maybeShiftDateOutOfLockedPeriod(workingDraft, ctx);
  if (dateShift.applied) {
    workingDraft = dateShift.draft;
    remediationsApplied.push("date_shifted");
    await logRemediation(ctx, "date_shifted", {
      from: draft.transactionDate,
      to: workingDraft.transactionDate,
    });
  } else if (dateShift.unresolvable) {
    return {
      ok: false,
      reason: POST_BLOCK_REASONS.PERIOD_LOCKED_NO_FALLBACK,
      details: { transaction_date: workingDraft.transactionDate },
      remediationsApplied,
    };
  }

  let payload: JEPayload;
  try {
    payload = convertJeDraftToJEPayload(workingDraft);
  } catch (e) {
    return {
      ok: false,
      reason: POST_BLOCK_REASONS.UNKNOWN_ERROR,
      details: { stage: "conversion", error: (e as Error).message },
      remediationsApplied,
    };
  }

  const tokenBundle = await resolveQBOTokenForFirmClient(ctx.firmClientId).catch((e) => {
    console.error("[remediation] token resolve failed", { ctx, error: e });
    return null;
  });
  if (!tokenBundle) {
    return {
      ok: false,
      reason: POST_BLOCK_REASONS.UNKNOWN_ERROR,
      details: { stage: "token_resolve" },
      remediationsApplied,
    };
  }

  const qboValidate = await validateJEPayload(
    ctx.firmClientId,
    payload,
    tokenBundle.realmId,
    tokenBundle.accessToken,
    undefined,
    undefined,
    tokenBundle.ownerUserId,
  );
  if (!qboValidate.valid) {
    return {
      ok: false,
      reason: mapQboValidatorReasonToBlockCode(qboValidate.reason),
      details: {
        stage: "qbo_validate",
        validator_reason: qboValidate.reason,
        ...(qboValidate.details ? { validator_details: qboValidate.details } : {}),
      },
      remediationsApplied,
    };
  }

  return { ok: true, payload, remediationsApplied };
}

function mapDraftValidatorReasonToBlockCode(reason?: string): PostBlockReason {
  switch (reason) {
    case "unbalanced":
      return POST_BLOCK_REASONS.DRAFT_INVALID_UNBALANCED;
    case "missing_lines":
    case "min_two_lines":
    case "line_has_both_dr_and_cr":
    case "line_has_zero_amount":
    case "invalid_dr":
    case "invalid_cr":
      return POST_BLOCK_REASONS.DRAFT_INVALID_LINE_SHAPE;
    case "line_missing_account":
      return POST_BLOCK_REASONS.DRAFT_INVALID_MISSING_ACCOUNT;
    case "missing_narration_or_date":
      return POST_BLOCK_REASONS.DRAFT_INVALID_MISSING_NARRATION;
    default:
      return POST_BLOCK_REASONS.UNKNOWN_ERROR;
  }
}

function mapQboValidatorReasonToBlockCode(reason: string): PostBlockReason {
  switch (reason) {
    case "unbalanced":
      return POST_BLOCK_REASONS.QBO_UNBALANCED;
    case "missing_account_id":
    case "invalid_account_id":
      return POST_BLOCK_REASONS.QBO_INVALID_ACCOUNT_ID;
    case "invalid_amount":
      return POST_BLOCK_REASONS.QBO_INVALID_AMOUNT;
    case "invalid_posting_type":
      return POST_BLOCK_REASONS.QBO_INVALID_POSTING_TYPE;
    case "period_locked":
      return POST_BLOCK_REASONS.QBO_PERIOD_LOCKED;
    default:
      return POST_BLOCK_REASONS.UNKNOWN_ERROR;
  }
}

async function remapAccountIds(
  draft: JEDraft,
  ctx: RemediationContext,
): Promise<
  | { applied: true; draft: JEDraft; mappings: Record<string, string> }
  | { applied: false; unresolvable: false }
  | { applied: false; unresolvable: true; unresolvedLines: number[] }
> {
  const problematic: number[] = draft.lines
    .map((l, i) => (QBO_ACCOUNT_ID_PATTERN.test(l.accountId) ? -1 : i))
    .filter((i) => i >= 0);
  if (problematic.length === 0) return { applied: false, unresolvable: false };

  const clientMemory = await import("@/lib/memory/client-memory-service").catch(() => null);
  const lookup =
    clientMemory &&
    typeof (clientMemory as { lookupAccountId?: unknown }).lookupAccountId === "function"
      ? (
          clientMemory as unknown as {
            lookupAccountId: (args: {
              firm_client_id: string;
              account_name: string;
            }) => Promise<string | null>;
          }
        ).lookupAccountId
      : null;
  if (!lookup) {
    return { applied: false, unresolvable: true, unresolvedLines: problematic };
  }

  const mappings: Record<string, string> = {};
  const unresolvedLines: number[] = [];
  const newLines = draft.lines.map((l) => ({ ...l }));
  for (const idx of problematic) {
    const line = newLines[idx];
    const remapped = await lookup({
      firm_client_id: ctx.firmClientId,
      account_name: line.accountName,
    });
    if (!remapped) {
      unresolvedLines.push(idx);
      continue;
    }
    mappings[line.accountName] = remapped;
    newLines[idx] = { ...line, accountId: remapped };
  }
  if (unresolvedLines.length > 0) {
    return { applied: false, unresolvable: true, unresolvedLines };
  }
  return { applied: true, draft: { ...draft, lines: newLines }, mappings };
}

async function maybeShiftDateOutOfLockedPeriod(
  draft: JEDraft,
  ctx: RemediationContext,
): Promise<
  | { applied: false; unresolvable: false }
  | { applied: true; draft: JEDraft }
  | { applied: false; unresolvable: true }
> {
  const supabase = createServiceClient();
  const originalDate = draft.transactionDate;
  const check = async (dateIso: string): Promise<boolean> => {
    const { data } = await supabase
      .from("close_periods")
      .select("id")
      .eq("firm_client_id", ctx.firmClientId)
      .in("status", ["locked", "signed_off"])
      .lte("period_start", dateIso)
      .gte("period_end", dateIso)
      .maybeSingle();
    return !!data;
  };
  if (!(await check(originalDate))) {
    return { applied: false, unresolvable: false };
  }

  const candidate = new Date(originalDate + "T00:00:00Z");
  for (let attempt = 0; attempt < 7; attempt++) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    const dow = candidate.getUTCDay();
    if (dow === 0) candidate.setUTCDate(candidate.getUTCDate() + 1);
    if (dow === 6) candidate.setUTCDate(candidate.getUTCDate() + 2);
    const iso = candidate.toISOString().slice(0, 10);
    if (!(await check(iso))) {
      return { applied: true, draft: { ...draft, transactionDate: iso } };
    }
  }
  return { applied: false, unresolvable: true };
}

async function logRemediation(
  ctx: RemediationContext,
  remediationType: string,
  details: unknown,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("ai_action_log").insert({
    firm_client_id: ctx.firmClientId,
    action_type: `remediation.${remediationType}`,
    action_category: "posting_remediation",
    model_name: "system:remediation",
    model_provider: "local",
    input_summary: `review_item=${ctx.reviewItemId} type=${remediationType}`,
    output_summary: JSON.stringify(details).slice(0, 4000),
  });
  if (error) {
    console.warn("[remediation] audit log failed (non-fatal)", { ctx, error });
  }
}
