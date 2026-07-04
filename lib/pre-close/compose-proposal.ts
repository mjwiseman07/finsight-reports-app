/**
 * D6.4c-1 — Compose a rule-fire outcome into a pre_close_review_items row.
 *
 * INPUT: a curated_rule_fires row (outcome='fired') that carries proposedJE in
 *        its reason_detail (rules populate reason_detail.proposedJE per the
 *        vertical-types contract).
 * OUTPUT: a pre_close_review_items row, ready to insert, with the basis guard
 *         already applied and captured in basis_guard_* columns.
 *
 * Impurity: reads curated_rules_registry (for basis scope) + firm_clients (for
 * accounting_method) via the service client. Does not write anywhere. Callers
 * (D6.4c-2 orchestrator) do the actual insert inside a transaction with a
 * ledger_event + ai_action_log row.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { applyBasisGuard, type AccountingMethod } from "@/lib/basis/guard";
import { detectAccrualLine } from "./detect-shape";
import { validateJeDraft } from "./je-draft-validate";
import { resolveEngagementForFirmClient } from "@/lib/engagements/resolve";
import { assertEntitlement } from "@/lib/entitlements/gate";
import type { AddonCode } from "@/lib/entitlements/registry";
import type { JEDraft, ReviewItemCompositionInput } from "./types";

export class ComposeProposalError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ComposeProposalError";
  }
}

export interface ComposeProposalInput {
  fireId: string;
  firmClientId: string;
  ruleId: string;
  ruleVersion: number;
  ruleReasonCode: string;
  ruleReasonDetail: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
  closePeriodId: string | null;
  /** Rules populate this in RuleResult.reason_detail.proposedJE per contract. */
  proposedJE: JEDraft;
  /** Optional list of evidence refs (D6.4a evidence packet pointers, source docs, etc.) */
  evidenceRefs?: Array<Record<string, unknown>>;
  /**
   * Optional entitlement gate. Callers pass this when the rule is add-on-flavored
   * (e.g., future intake-review rules -> 'ap_intake'). D6.4c-1's 24 rules pass
   * undefined -> no gate.
   */
  addonGate?: AddonCode;
}

export type ComposeProposalResult =
  | {
      status: "composed";
      row: ReviewItemCompositionInput;
    }
  | {
      status: "basis_blocked";
      reasonCode: string;
      reasonText: string;
      // Return the composition input WITH the block reason so the caller can
      // still write an audit row (curated_rule_fires reviewer_action='suppressed'
      // in D6.4c-2's orchestrator).
      wouldHaveComposed: Omit<ReviewItemCompositionInput, "basisGuardReasonCode" | "basisGuardReasonText">;
    }
  | {
      status: "invalid_draft";
      reason: string;
    };

export async function composeProposal(
  input: ComposeProposalInput,
): Promise<ComposeProposalResult> {
  const supabase = createServiceClient();

  // 1. Validate JE draft shape (pure, fail fast)
  const validation = validateJeDraft(input.proposedJE);
  if (!validation.ok) {
    return { status: "invalid_draft", reason: validation.reason ?? "unknown" };
  }

  // 2. Resolve engagement (real resolver, no band-aid)
  const { engagementId } = await resolveEngagementForFirmClient(input.firmClientId);

  // 3. Load engagement accounting method (needed for basis guard).
  //    Sourced from firm_clients.accounting_method — same source the rule
  //    execution service reads. Kept consistent instead of duplicating on
  //    engagements (D6.4c-1 does not migrate that column).
  const { data: fc, error: fcErr } = await supabase
    .from("firm_clients")
    .select("accounting_method")
    .eq("id", input.firmClientId)
    .maybeSingle();
  if (fcErr) throw new ComposeProposalError("firm_clients lookup failed", fcErr);
  const accountingMethod: AccountingMethod =
    (fc?.accounting_method as AccountingMethod | undefined) ?? "accrual";

  // 4. Load rule scope from curated_rules_registry
  const { data: reg, error: regErr } = await supabase
    .from("curated_rules_registry")
    .select("applies_to_cash_basis, applies_to_accrual_basis, is_active")
    .eq("rule_id", input.ruleId)
    .maybeSingle();
  if (regErr) throw new ComposeProposalError("curated_rules_registry lookup failed", regErr);
  if (!reg) throw new ComposeProposalError(`rule not in registry: ${input.ruleId}`);

  // 5. Entitlement gate (only for add-on-flavored rules)
  if (input.addonGate) {
    await assertEntitlement(input.addonGate, engagementId, {
      caller: "pre-close.compose-proposal",
      firmClientId: input.firmClientId,
      actorType: "system",
      metadata: { rule_id: input.ruleId, fire_id: input.fireId },
    });
  }

  // 6. Apply basis guard
  const guard = applyBasisGuard({
    engagementMethod: accountingMethod,
    ruleScope: {
      applies_to_cash_basis: Boolean(reg.applies_to_cash_basis),
      applies_to_accrual_basis: Boolean(reg.applies_to_accrual_basis),
    },
    proposalShape: { hasAccrualLine: detectAccrualLine(input.proposedJE) },
    ruleId: input.ruleId,
  });

  const wouldHaveComposed: Omit<
    ReviewItemCompositionInput,
    "basisGuardReasonCode" | "basisGuardReasonText"
  > = {
    fireId: input.fireId,
    firmClientId: input.firmClientId,
    engagementId,
    closePeriodId: input.closePeriodId,
    ruleId: input.ruleId,
    ruleVersion: input.ruleVersion,
    accountingMethod,
    ruleReasonCode: input.ruleReasonCode,
    ruleReasonDetail: input.ruleReasonDetail,
    severity: input.severity,
    jeDraft: input.proposedJE,
    evidenceRefs: input.evidenceRefs ?? [],
  };

  if (!guard.allowed) {
    return {
      status: "basis_blocked",
      reasonCode: guard.reason_code ?? "unknown",
      reasonText: guard.reason_text ?? "unknown",
      wouldHaveComposed,
    };
  }

  return {
    status: "composed",
    row: {
      ...wouldHaveComposed,
      basisGuardReasonCode: null,
      basisGuardReasonText: null,
    },
  };
}
