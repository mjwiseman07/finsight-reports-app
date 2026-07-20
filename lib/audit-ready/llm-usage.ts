import { createServiceClient } from '@/lib/supabase/service';
import type { BedrockCallResult, BedrockModel } from './bedrock-client';
import { estimateCostCents, isBedrockZeroRetentionEnabled } from './bedrock-client';

export type LlmOperation =
  | 'pbc_parse'
  | 'assertion_classify'
  | 'pii_redaction_ner'
  | 'response_draft'
  | 'evidence_bundle_summary'
  | 'tieout_explain'
  | 'tie_out_kind_classify';

export interface UsageContext {
  engagementId: string;
  operation: LlmOperation;
  calledByUserId: string | null;
  redactionMapId?: string | null;
}

export interface CapCheckResult {
  allowed: boolean;
  modelToUse: BedrockModel;
  currentSpendCents: number;
  capCents: number;
  reason: 'under_threshold' | 'over_threshold_fallback' | 'over_cap_blocked';
}

const CAP_CENTS = Number(process.env.AR_LLM_ENGAGEMENT_CAP_USD_CENTS ?? 800);
const FALLBACK_PCT = Number(process.env.AR_LLM_FALLBACK_THRESHOLD_PCT ?? 90);

/**
 * Before each Bedrock call, check current engagement spend and decide model.
 */
export async function checkEngagementCap(
  engagementId: string,
  preferredModel: BedrockModel,
): Promise<CapCheckResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('audit_ready_llm_usage')
    .select('cost_usd_cents')
    .eq('engagement_id', engagementId)
    .eq('success', true);

  if (error) throw new Error(`cap_check_failed:${error.message}`);

  const currentSpend = (data ?? []).reduce(
    (sum, r) => sum + (r.cost_usd_cents ?? 0),
    0,
  );
  const threshold = Math.floor((CAP_CENTS * FALLBACK_PCT) / 100);

  if (currentSpend >= CAP_CENTS) {
    return {
      allowed: false,
      modelToUse: 'haiku',
      currentSpendCents: currentSpend,
      capCents: CAP_CENTS,
      reason: 'over_cap_blocked',
    };
  }
  if (currentSpend >= threshold) {
    return {
      allowed: true,
      modelToUse: 'haiku',
      currentSpendCents: currentSpend,
      capCents: CAP_CENTS,
      reason: 'over_threshold_fallback',
    };
  }
  return {
    allowed: true,
    modelToUse: preferredModel,
    currentSpendCents: currentSpend,
    capCents: CAP_CENTS,
    reason: 'under_threshold',
  };
}

export async function logUsage(
  ctx: UsageContext,
  result: BedrockCallResult,
  model: BedrockModel,
  success: boolean,
  errorCode?: string,
): Promise<void> {
  const supabase = createServiceClient();
  const costCents = estimateCostCents(
    model,
    result.promptTokens,
    result.completionTokens,
  );
  const { error } = await supabase.from('audit_ready_llm_usage').insert({
    engagement_id: ctx.engagementId,
    operation: ctx.operation,
    model_id: result.modelId,
    model_family: model,
    prompt_tokens: result.promptTokens,
    completion_tokens: result.completionTokens,
    cost_usd_cents: costCents,
    latency_ms: result.latencyMs,
    zero_retention_flag: isBedrockZeroRetentionEnabled(),
    redaction_map_id: ctx.redactionMapId ?? null,
    called_by_user_id: ctx.calledByUserId,
    request_hash: result.requestHash,
    success,
    error_code: errorCode ?? null,
  });
  if (error) {
    console.error('[audit_ready_llm_usage] insert failed', error);
  }
}

export async function getEngagementUsageSummary(engagementId: string): Promise<{
  totalSpendCents: number;
  totalCalls: number;
  byOperation: Record<string, { calls: number; spendCents: number }>;
  byModel: Record<string, { calls: number; spendCents: number }>;
  capCents: number;
  pctOfCap: number;
  status: 'under_threshold' | 'over_threshold_fallback' | 'over_cap_blocked';
}> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('audit_ready_llm_usage')
    .select('operation, model_family, cost_usd_cents, success')
    .eq('engagement_id', engagementId)
    .eq('success', true);

  if (error) throw new Error(`usage_summary_failed:${error.message}`);

  const rows = data ?? [];
  const totalSpend = rows.reduce((s, r) => s + (r.cost_usd_cents ?? 0), 0);
  const byOperation: Record<string, { calls: number; spendCents: number }> = {};
  const byModel: Record<string, { calls: number; spendCents: number }> = {};

  for (const r of rows) {
    const op = String(r.operation);
    const mf = String(r.model_family);
    if (!byOperation[op]) byOperation[op] = { calls: 0, spendCents: 0 };
    if (!byModel[mf]) byModel[mf] = { calls: 0, spendCents: 0 };
    byOperation[op].calls += 1;
    byOperation[op].spendCents += r.cost_usd_cents ?? 0;
    byModel[mf].calls += 1;
    byModel[mf].spendCents += r.cost_usd_cents ?? 0;
  }

  const pctOfCap = CAP_CENTS > 0 ? (totalSpend / CAP_CENTS) * 100 : 0;
  const threshold = Math.floor((CAP_CENTS * FALLBACK_PCT) / 100);
  const status =
    totalSpend >= CAP_CENTS
      ? 'over_cap_blocked'
      : totalSpend >= threshold
        ? 'over_threshold_fallback'
        : 'under_threshold';

  return {
    totalSpendCents: totalSpend,
    totalCalls: rows.length,
    byOperation,
    byModel,
    capCents: CAP_CENTS,
    pctOfCap,
    status,
  };
}
