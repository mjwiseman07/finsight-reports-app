import { createServiceClient } from "@/lib/supabase/service";
import { invokeClaude } from "@/lib/llm/anthropic-driver";
import { logAiAction } from "@/lib/ai/action-logger";
import type { DetectedGap } from "@/lib/assertions/gap-detector";
import type { RootCauseCode } from "@/lib/pre-close/assertions-coverage-types";
import { ROOT_CAUSE_CODES } from "@/lib/pre-close/assertions-coverage-types";

export interface ReasonerContext {
  firmClientId: string;
  closePeriodId: string;
  workerRunId: string;
  industryVertical: string;
}

export interface ReasonerResult {
  root_cause_code: RootCauseCode;
  recommendation: string;
  reasoning: string;
  action_id: string;
}

export interface ReasonerOutcome {
  enabled: boolean;
  results: Array<{ gap: DetectedGap; result?: ReasonerResult; error?: string }>;
}

async function isReasoningEnabled(): Promise<boolean> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("advisacor_flags")
    .select("flag_value")
    .eq("flag_key", "assertions_gap_reasoning_enabled")
    .maybeSingle();
  if (error) throw error;
  return !!data?.flag_value;
}

const SYSTEM_PROMPT = `You are an audit-methodology assistant embedded in Advisacor, a
close-automation platform. You are shown one assertion coverage gap at a time and
must return a JSON object with:
  - root_cause_code: exactly one of ${ROOT_CAUSE_CODES.join(", ")}
  - recommendation: 1-3 sentences of specific remediation advice for the practitioner
    (add a rule, adjust a threshold, document a manual test, mark not-applicable, etc.)
  - reasoning: 2-4 sentences citing the ISA 315 / PCAOB / AICPA basis for the recommendation.
Rules:
  1. root_cause_code MUST match the deterministic root cause you were passed in the
     input unless you have a strong reason to override (e.g. the practitioner has
     documented a manual test). If you override, explain why in reasoning.
  2. Never invent standards references. Use only ISA 315 (Revised 2019), ISA 330,
     PCAOB AS 1105, PCAOB AS 2301, PCAOB QC 1000, or the account-category-specific
     ASC/IFRS citations already present in the relevance matrix (which you were shown).
  3. Return only the JSON object, no prose before or after.
`;

async function reasonSingleGap(
  gap: DetectedGap,
  ctx: ReasonerContext,
): Promise<ReasonerResult> {
  const user = JSON.stringify({
    firm_client_id: ctx.firmClientId,
    close_period_id: ctx.closePeriodId,
    industry_vertical: ctx.industryVertical,
    account_category: gap.account_category,
    assertion_id: gap.assertion_id,
    deterministic_root_cause_code: gap.root_cause_code,
  });

  const invocation = await invokeClaude({
    tier: "primary",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: user }],
    maxTokens: 512,
    temperature: 0.1,
    jsonMode: true,
  });

  let parsed: { root_cause_code: string; recommendation: string; reasoning: string };
  try {
    parsed = JSON.parse(invocation.text);
  } catch {
    throw new Error(`Reasoner returned non-JSON: ${invocation.text.slice(0, 200)}`);
  }

  if (!ROOT_CAUSE_CODES.includes(parsed.root_cause_code as RootCauseCode)) {
    throw new Error(`Reasoner returned invalid root_cause_code: ${parsed.root_cause_code}`);
  }

  const modelProvider = invocation.provider === "bedrock" ? "aws_bedrock" : "anthropic";
  const { actionId } = await logAiAction({
    firmClientId: ctx.firmClientId,
    actionType: "gap_reasoning",
    actionCategory: "assertion_gap_reasoning",
    modelName: invocation.modelId,
    modelProvider,
    input: { gap, ctx },
    output: parsed,
    inputSummary: `gap ${gap.account_category}/${gap.assertion_id}`,
    outputSummary: parsed.root_cause_code,
    latencyMs: invocation.latencyMs,
    inputTokens: invocation.inputTokens,
    outputTokens: invocation.outputTokens,
    correlationId: ctx.workerRunId,
  });

  return {
    root_cause_code: parsed.root_cause_code as RootCauseCode,
    recommendation: parsed.recommendation,
    reasoning: parsed.reasoning,
    action_id: actionId,
  };
}

export async function reasonGaps(
  gaps: DetectedGap[],
  ctx: ReasonerContext,
): Promise<ReasonerOutcome> {
  const enabled = await isReasoningEnabled();
  if (!enabled) {
    return { enabled: false, results: [] };
  }

  const results: ReasonerOutcome["results"] = [];
  for (const gap of gaps) {
    try {
      const result = await reasonSingleGap(gap, ctx);
      results.push({ gap, result });
    } catch (e) {
      results.push({
        gap,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { enabled: true, results };
}
