import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
import type { RunOptions, RunSummary, LoadedRule } from "./types";
import { loadClient, loadActiveRules } from "./load-active-rules";
import { writeFire } from "./write-fire";
import { computeInputsHash } from "./compute-inputs-hash";
import { resolveQBOForClient } from "./resolve-qbo";

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
    await writeFire(supabase, {
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
