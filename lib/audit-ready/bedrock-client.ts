/**
 * Bedrock client with zero-retention logging + Haiku/Sonnet model selection.
 *
 * Zero-retention: account-level Bedrock data retention must be disabled in AWS.
 * Every usage row stores zero_retention_flag from AWS_BEDROCK_ZERO_RETENTION.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import crypto from 'node:crypto';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

function getClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.AWS_BEDROCK_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: requireEnv('AWS_BEDROCK_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('AWS_BEDROCK_SECRET_ACCESS_KEY'),
    },
  });
}

export type BedrockModel = 'sonnet' | 'haiku';

export interface BedrockCallInput {
  model: BedrockModel;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  toolSchema?: Record<string, unknown>;
}

export interface BedrockCallResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  modelId: string;
  latencyMs: number;
  requestHash: string;
}

const MODEL_IDS: Record<BedrockModel, () => string> = {
  sonnet: () =>
    process.env.AWS_BEDROCK_SONNET_MODEL_ID ??
    'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  haiku: () =>
    process.env.AWS_BEDROCK_HAIKU_MODEL_ID ??
    'us.anthropic.claude-haiku-4-5-20251001-v1:0',
};

// Anthropic model pricing (per 1K tokens) as of July 2026 — USD cents
const PRICING_PER_1K_USD_CENTS: Record<
  BedrockModel,
  { prompt: number; completion: number }
> = {
  sonnet: { prompt: 0.3, completion: 1.5 },
  haiku: { prompt: 0.08, completion: 0.4 },
};

export function estimateCostCents(
  model: BedrockModel,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = PRICING_PER_1K_USD_CENTS[model];
  const cost =
    (promptTokens / 1000) * p.prompt + (completionTokens / 1000) * p.completion;
  return Math.ceil(cost);
}

export function isBedrockZeroRetentionEnabled(): boolean {
  return process.env.AWS_BEDROCK_ZERO_RETENTION !== 'false';
}

export async function invokeBedrock(
  input: BedrockCallInput,
): Promise<BedrockCallResult> {
  const started = Date.now();
  const modelId = MODEL_IDS[input.model]();
  const requestBody: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: input.maxTokens ?? 4096,
    temperature: input.temperature ?? 0.1,
    system: input.systemPrompt,
    messages: [{ role: 'user', content: input.userPrompt }],
  };
  if (input.toolSchema) {
    requestBody.tools = [input.toolSchema];
  }

  const bodyString = JSON.stringify(requestBody);
  const requestHash = crypto.createHash('sha256').update(bodyString).digest('hex');

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: bodyString,
  });

  const response = await getClient().send(command);
  const decoded = JSON.parse(new TextDecoder().decode(response.body));
  const rawContent = decoded.content?.[0]?.text ?? decoded.content?.[0]?.input ?? '';
  const promptTokens = decoded.usage?.input_tokens ?? 0;
  const completionTokens = decoded.usage?.output_tokens ?? 0;

  return {
    content: typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
    promptTokens,
    completionTokens,
    modelId,
    latencyMs: Date.now() - started,
    requestHash,
  };
}
