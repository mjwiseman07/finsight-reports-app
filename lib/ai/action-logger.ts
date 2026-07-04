/**
 * AI Action Logger
 *
 * Every LLM-driven system action is logged here, in addition to publishing
 * an ai_action event on the ledger_events stream. This provides:
 *   - Decision transparency (which model made which decision with what confidence)
 *   - Cost tracking (per firm_client, per action_category, per model)
 *   - Replay capability (input_ref_uri + input_hash allow rerun with newer models)
 *   - Human-in-loop review workflow
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { createHash, randomUUID } from "node:crypto";

export type AiActionCategory =
  | "intake_ocr"
  | "intake_classify"
  | "cash_app_reasoning"
  | "ar_dunning_draft"
  | "assertion_reasoning"
  | "assertion_coverage_scan"
  | "assertion_gap_reasoning"
  | "je_proposal"
  | "anomaly_reasoning"
  | "recon_reasoning"
  | "agent_close_walkthrough"
  | "other";

export type ModelProvider = "anthropic" | "openai" | "google" | "aws_bedrock" | "local";

export interface LogAiActionInput {
  firmClientId?: string;
  actionType: string;
  actionCategory: AiActionCategory;
  modelName: string;
  modelProvider: ModelProvider;
  input: unknown;
  output: unknown;
  inputSummary?: string;
  outputSummary?: string;
  confidence?: number;
  latencyMs?: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  temperature?: number;
  seed?: number;
  inputRefUri?: string;
  outputRefUri?: string;
  correlationId?: string;
  linkedEventId?: string;
}

export function sha256(value: unknown): string {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(str).digest("hex");
}

export function summarize(value: unknown, maxLen = 400): string {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length <= maxLen ? str : str.slice(0, maxLen - 3) + "...";
}

export async function logAiAction(
  input: LogAiActionInput,
): Promise<{ actionId: string; eventId: string }> {
  const supabase = createServiceClient();
  const correlationId = input.correlationId ?? randomUUID();

  const { data: action, error: actionError } = await supabase
    .from("ai_action_log")
    .insert({
      firm_client_id: input.firmClientId ?? null,
      action_type: input.actionType,
      action_category: input.actionCategory,
      model_name: input.modelName,
      model_provider: input.modelProvider,
      input_summary: input.inputSummary ?? summarize(input.input),
      input_hash: sha256(input.input),
      input_ref_uri: input.inputRefUri ?? null,
      output_summary: input.outputSummary ?? summarize(input.output),
      output_hash: sha256(input.output),
      output_ref_uri: input.outputRefUri ?? null,
      confidence: input.confidence ?? null,
      latency_ms: input.latencyMs ?? null,
      cost_usd: input.costUsd ?? null,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      temperature: input.temperature ?? null,
      seed: input.seed ?? null,
      correlation_id: correlationId,
      linked_event_id: input.linkedEventId ?? null,
    })
    .select("action_id")
    .single();

  if (actionError) throw new Error(`logAiAction insert failed: ${actionError.message}`);

  // Publish corresponding ai_action ledger event
  const evt = await publishEvent({
    eventType: `ai.${input.actionCategory}.executed`,
    eventCategory: "ai_action",
    firmClientId: input.firmClientId,
    aggregateType: "ai_action",
    aggregateId: action.action_id,
    actorType: "ai_agent",
    actorId: `${input.modelProvider}:${input.modelName}`,
    payload: {
      action_type: input.actionType,
      action_category: input.actionCategory,
      confidence: input.confidence,
      cost_usd: input.costUsd,
      latency_ms: input.latencyMs,
      input_hash: sha256(input.input),
      output_hash: sha256(input.output),
    },
    metadata: {
      model_name: input.modelName,
      model_provider: input.modelProvider,
    },
    correlationId,
  });

  // Link the event back to the action
  await supabase
    .from("ai_action_log")
    .update({ linked_event_id: evt.eventId })
    .eq("action_id", action.action_id);

  return { actionId: action.action_id, eventId: evt.eventId };
}
