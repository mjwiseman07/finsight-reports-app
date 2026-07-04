import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
import type { RunOptions, RunSummary, LoadedRule } from "./types";
import { loadClient, loadActiveRules } from "./load-active-rules";
import { writeFire } from "./write-fire";
import { computeInputsHash } from "./compute-inputs-hash";
import { resolveQBOForClient } from "./resolve-qbo";
import { composeProposal, ComposeProposalError } from "@/lib/pre-close/compose-proposal";
import { insertReviewItem, InsertReviewItemError } from "@/lib/pre-close/insert-review-item";
import { publishEvent } from "@/lib/events/publisher";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import type { JEDraft } from "@/lib/pre-close/types";

/**
 * Best-effort Sentry capture. Per D6 decision #7 this is wired but log-only:
 * @sentry/nextjs is NOT a project dependency, so we resolve the module through a
 * runtime string (kept out of TypeScript's static module resolution) and swallow
 * any failure. If SENTRY_DSN is unset or the package is absent, this is a no-op.
 */
async function captureExceptionBestEffort(
  err: unknown,
  tags: Record<string, string>,
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const sentryModuleName = "@sentry/nextjs";
    const Sentry = (await import(sentryModuleName)) as {
      captureException?: (e: unknown, ctx?: { tags?: Record<string, string> }) => void;
    };
    Sentry.captureException?.(err, { tags });
  } catch {
    // Sentry not installed / not configured — log-only per D6 decision #7.
  }
}

export async function executeRules(
  supabase: SupabaseClient,
  opts: RunOptions,
): Promise<RunSummary> {
  const runId = randomUUID();
  const start = Date.now();
  const summary: RunSummary = {
    runId,
    firmClientId: opts.firmClientId,
    trigger: opts.trigger,
    rulesEvaluated: 0,
    fires: { fired: 0, suppressed: 0, error: 0, not_implemented: 0 },
    proposals: {
      composed: 0,
      basis_blocked: 0,
      invalid_draft: 0,
      composition_error: 0,
      entitlement_denied: 0,
      no_proposal: 0,
    },
    durationMs: 0,
    killSwitchShortCircuit: false,
  };

  const client = await loadClient(supabase, opts.firmClientId);
  if (!client) {
    summary.durationMs = Date.now() - start;
    return summary;
  }

  // Guardrail 1: kill switch
  if (!client.vertical_rules_enabled) {
    summary.killSwitchShortCircuit = true;
    summary.durationMs = Date.now() - start;
    return summary;
  }

  // Guardrail 2: vertical scope (loadActiveRules restricts to general + client vertical)
  // Guardrail 4: enabled gate (loadActiveRules filters is_active = true)
  const rules = await loadActiveRules(supabase, client, opts.ruleIdFilter);

  // Guardrail 9 (D6.2a): QBO health short-circuit. Resolve once per run. If the
  // connection is unhealthy/missing, qbo is null and QBO-dependent rules
  // self-suppress; memory-only rules (e.g. gl_mapping_variance) still run.
  const qboResolve = await resolveQBOForClient(client.firm_client_id);

  const target =
    opts.targetFilter ?? { targetType: "account" as const, targetRef: opts.firmClientId };

  for (const rule of rules) {
    summary.rulesEvaluated++;

    // Guardrail 3: cash-basis gate (Option B — suppress with audit trail)
    if (client.accounting_method === "cash" && !rule.applies_to_cash_basis) {
      await recordSuppression(supabase, rule, client, target, opts, "cash_basis_scope");
      summary.fires.suppressed++;
      continue;
    }
    if (client.accounting_method === "accrual" && !rule.applies_to_accrual_basis) {
      await recordSuppression(supabase, rule, client, target, opts, "accrual_basis_scope");
      summary.fires.suppressed++;
      continue;
    }

    const module = RULE_REGISTRY[rule.rule_id];
    if (!module) {
      await recordSuppression(supabase, rule, client, target, opts, "no_module");
      summary.fires.suppressed++;
      continue;
    }

    const inputs: Record<string, unknown> = {};
    const inputsHash = computeInputsHash(
      rule.rule_id,
      target.targetType,
      target.targetRef,
      inputs,
    );
    const ctx: RuleContext = {
      firmClientId: client.firm_client_id,
      companyId: client.company_id,
      industryVertical: client.industry_vertical,
      accountingMethod: client.accounting_method,
      targetType: target.targetType,
      targetRef: target.targetRef,
      inputs,
      inputsHash,
      qbo: qboResolve.handle,
      closePeriodId: opts.closePeriodId,
    };

    let result: RuleResult;
    try {
      result = await module.evaluate(ctx);
    } catch (err) {
      // Guardrail 5: error isolation — one bad rule never poisons the run.
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      await captureExceptionBestEffort(err, {
        rule_id: rule.rule_id,
        firm_client_id: client.firm_client_id,
      });
      await writeFire(supabase, {
        firm_client_id: client.firm_client_id,
        rule_id: rule.rule_id,
        rule_version: rule.rule_version,
        proposal_id: opts.proposalId ?? null,
        recurring_fire_id: opts.recurringFireId ?? null,
        target_type: target.targetType,
        target_ref: target.targetRef,
        inputs_hash: inputsHash,
        outcome: "error",
        reason_code: "exception",
        reason_detail: { message, stack },
        severity_applied: rule.severity,
        memory_record_id: null,
      });
      summary.fires.error++;
      continue;
    }

    // Guardrail 6: idempotency — writeFire treats a unique-violation as a no-op.
    const fireWrite = await writeFire(supabase, {
      firm_client_id: client.firm_client_id,
      rule_id: rule.rule_id,
      rule_version: rule.rule_version,
      proposal_id: opts.proposalId ?? null,
      recurring_fire_id: opts.recurringFireId ?? null,
      target_type: target.targetType,
      target_ref: target.targetRef,
      inputs_hash: inputsHash,
      outcome: result.outcome,
      reason_code: result.reason_code,
      reason_detail: result.reason_detail,
      severity_applied: result.severity_override ?? rule.severity,
      memory_record_id: null,
    });

    if (result.outcome === "fired") summary.fires.fired++;
    else if (result.outcome === "suppressed") summary.fires.suppressed++;
    else if (result.outcome === "error") summary.fires.error++;
    else if (result.outcome === "not_implemented") summary.fires.not_implemented++;

    // D6.4c-2: orchestrate proposal composition for fired rules with proposedJE.
    // Skip if dedup no-op (fireWrite.inserted === false) — the first fire owns
    // composition (idempotency respects the first outcome).
    if (
      result.outcome === "fired" &&
      fireWrite.inserted &&
      fireWrite.fire_id &&
      hasProposedJE(result.reason_detail)
    ) {
      await orchestrateProposal({
        summary,
        fireId: fireWrite.fire_id,
        firmClientId: client.firm_client_id,
        rule,
        result,
        closePeriodId: opts.closePeriodId ?? null,
        supabase,
      });
    } else if (result.outcome === "fired" && fireWrite.inserted) {
      // Rule fired but is flag-only (no proposedJE) — this is correct behavior.
      summary.proposals.no_proposal++;
    }
  }

  summary.durationMs = Date.now() - start;
  return summary;
}

async function recordSuppression(
  supabase: SupabaseClient,
  rule: LoadedRule,
  client: { firm_client_id: string; accounting_method: string },
  target: { targetType: RuleContext["targetType"]; targetRef: string },
  opts: RunOptions,
  reasonCode: string,
): Promise<void> {
  const inputsHash = computeInputsHash(rule.rule_id, target.targetType, target.targetRef, {});
  await writeFire(supabase, {
    firm_client_id: client.firm_client_id,
    rule_id: rule.rule_id,
    rule_version: rule.rule_version,
    proposal_id: opts.proposalId ?? null,
    recurring_fire_id: opts.recurringFireId ?? null,
    target_type: target.targetType,
    target_ref: target.targetRef,
    inputs_hash: inputsHash,
    outcome: "suppressed",
    reason_code: reasonCode,
    reason_detail: { accounting_method: client.accounting_method },
    severity_applied: rule.severity,
    memory_record_id: null,
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * D6.4c-2 — pre_close_review_items.close_period_id is uuid; ledger_events.close_period_id
 * is text. The runner's opts.closePeriodId is a string sourced from close_periods.id
 * (a UUID) in real runs. Only test fixtures pass non-UUID strings. Sanitize to a
 * UUID-or-null for the composer path so a bad fixture value can't hit the uuid column.
 */
function toUuidOrNull(value: string | null): string | null {
  if (value && UUID_RE.test(value)) return value;
  return null;
}

/** Type guard: does the rule's reason_detail contain a proposedJE object? */
function hasProposedJE(reasonDetail: Record<string, unknown>): boolean {
  const pj = (reasonDetail as { proposedJE?: unknown }).proposedJE;
  if (!pj || typeof pj !== "object") return false;
  const draft = pj as Partial<JEDraft>;
  return Array.isArray(draft.lines) && typeof draft.transactionDate === "string";
}

interface OrchestrateProposalArgs {
  summary: RunSummary;
  fireId: string;
  firmClientId: string;
  rule: LoadedRule;
  result: RuleResult;
  closePeriodId: string | null;
  supabase: SupabaseClient;
}

/**
 * D6.4c-2 — orchestrate composeProposal + insertReviewItem after a successful fire.
 * Errors are isolated (never poison the run), audited via ledger_events, and counted.
 */
async function orchestrateProposal(args: OrchestrateProposalArgs): Promise<void> {
  const { summary, fireId, firmClientId, rule, result, closePeriodId } = args;
  const proposedJE = (result.reason_detail as { proposedJE?: unknown }).proposedJE as JEDraft;
  // ledger_events.close_period_id is TEXT (raw string OK); the composer path feeds
  // the uuid column, so it gets a UUID-sanitized value (P0.11 / P0.12).
  const composerClosePeriodId = toUuidOrNull(closePeriodId);
  try {
    const composed = await composeProposal({
      fireId,
      firmClientId,
      ruleId: rule.rule_id,
      ruleVersion: rule.rule_version,
      ruleReasonCode: result.reason_code,
      ruleReasonDetail: result.reason_detail,
      severity: result.severity_override ?? rule.severity,
      closePeriodId: composerClosePeriodId,
      proposedJE,
      evidenceRefs: extractEvidenceRefs(result.reason_detail),
      // No addonGate for D6.4c-2 canary. Add-on-gated rules land in D6.5/D6.7.
    });

    if (composed.status === "composed") {
      await insertReviewItem(composed.row);
      summary.proposals.composed++;
      return;
    }

    if (composed.status === "basis_blocked") {
      // Fire stays as-is (append-only). Audit the block via ledger_events.
      await publishEvent({
        eventType: "review_item.basis_blocked",
        eventCategory: "rule",
        firmClientId,
        engagementId: composed.wouldHaveComposed.engagementId,
        closePeriodId: closePeriodId ?? undefined,
        aggregateType: "curated_rule_fire",
        aggregateId: fireId,
        actorType: "rule",
        actorId: rule.rule_id,
        payload: {
          rule_id: rule.rule_id,
          rule_version: rule.rule_version,
          fire_id: fireId,
          reason_code: composed.reasonCode,
          reason_text: composed.reasonText,
          engagement_accounting_method: composed.wouldHaveComposed.accountingMethod,
        },
      });
      summary.proposals.basis_blocked++;
      return;
    }

    if (composed.status === "invalid_draft") {
      // Fire stays as-is (append-only). Audit the invalid draft via ledger_events.
      // composeProposal fails fast on validation before resolving the engagement,
      // so we scope to firm_client only (allowed by the publisher).
      await publishEvent({
        eventType: "review_item.invalid_draft",
        eventCategory: "rule",
        firmClientId,
        closePeriodId: closePeriodId ?? undefined,
        aggregateType: "curated_rule_fire",
        aggregateId: fireId,
        actorType: "rule",
        actorId: rule.rule_id,
        payload: {
          rule_id: rule.rule_id,
          rule_version: rule.rule_version,
          fire_id: fireId,
          reason: composed.reason,
        },
      });
      summary.proposals.invalid_draft++;
      return;
    }

    // Should never happen — exhaustive check.
    throw new Error(
      `unreachable composeProposal status: ${(composed as { status: string }).status}`,
    );
  } catch (err) {
    if (err instanceof EntitlementDenied) {
      summary.proposals.entitlement_denied++;
      await publishEvent({
        eventType: "review_item.entitlement_denied",
        eventCategory: "rule",
        firmClientId,
        aggregateType: "curated_rule_fire",
        aggregateId: fireId,
        actorType: "rule",
        actorId: rule.rule_id,
        payload: {
          rule_id: rule.rule_id,
          rule_version: rule.rule_version,
          fire_id: fireId,
          addon_code: err.addonCode,
          engagement_id: err.engagementId,
        },
      }).catch(() => {
        /* audit-of-audit failure — swallow to preserve run */
      });
      return;
    }

    // Any other exception is a composition error. Isolate + audit + move on.
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const errorKind =
      err instanceof ComposeProposalError
        ? "compose_failed"
        : err instanceof InsertReviewItemError
          ? "insert_failed"
          : "unknown";
    await captureExceptionBestEffort(err, {
      rule_id: rule.rule_id,
      firm_client_id: firmClientId,
      phase: "d6.4c-2_orchestrate_proposal",
      error_kind: errorKind,
    });
    await publishEvent({
      eventType: "review_item.composition_error",
      eventCategory: "rule",
      firmClientId,
      closePeriodId: closePeriodId ?? undefined,
      aggregateType: "curated_rule_fire",
      aggregateId: fireId,
      actorType: "rule",
      actorId: rule.rule_id,
      payload: {
        rule_id: rule.rule_id,
        rule_version: rule.rule_version,
        fire_id: fireId,
        error_kind: errorKind,
        message,
        stack,
      },
    }).catch(() => {
      /* swallow audit-of-audit failures */
    });
    summary.proposals.composition_error++;
  }
}

/** Pull evidence refs off the rule's reason_detail if the rule provided any. */
function extractEvidenceRefs(
  reasonDetail: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const evidence = (reasonDetail as { evidenceRefs?: unknown }).evidenceRefs;
  if (!Array.isArray(evidence)) return [];
  return evidence.filter(
    (e): e is Record<string, unknown> => typeof e === "object" && e !== null,
  );
}
