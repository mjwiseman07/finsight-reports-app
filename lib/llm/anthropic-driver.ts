import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export type ClaudeTier = "primary" | "haiku" | "toptier";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeInvocation {
  tier: ClaudeTier;
  system: string;
  messages: ClaudeMessage[];
  maxTokens: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface ClaudeResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  provider: "bedrock" | "anthropic_direct";
  modelId: string;
}

function pickModelId(tier: ClaudeTier, provider: "bedrock" | "anthropic_direct"): string {
  if (provider === "bedrock") {
    switch (tier) {
      case "primary":
        return process.env.BEDROCK_MODEL_SONNET_PRIMARY ?? "";
      case "haiku":
        return process.env.BEDROCK_MODEL_HAIKU ?? "";
      case "toptier":
        return process.env.BEDROCK_MODEL_SONNET_TOPTIER ?? "";
    }
  }
  switch (tier) {
    case "primary":
      return process.env.ANTHROPIC_MODEL_SONNET_PRIMARY ?? "";
    case "haiku":
      return process.env.ANTHROPIC_MODEL_HAIKU ?? "";
    case "toptier":
      return process.env.ANTHROPIC_MODEL_SONNET_TOPTIER ?? "";
  }
}

export async function invokeClaude(invocation: ClaudeInvocation): Promise<ClaudeResult> {
  const useBedrock = (process.env.BEDROCK_ENABLED ?? "true").toLowerCase() === "true";
  const provider: "bedrock" | "anthropic_direct" = useBedrock ? "bedrock" : "anthropic_direct";
  const modelId = pickModelId(invocation.tier, provider);
  if (!modelId) {
    throw new Error(
      `Claude driver: model id not configured for tier=${invocation.tier} provider=${provider}`,
    );
  }

  const start = Date.now();
  const messages = invocation.messages.map((m) => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));

  if (provider === "bedrock") {
    const client = new BedrockRuntimeClient({
      region: process.env.BEDROCK_REGION ?? "us-east-1",
    });
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      system: invocation.system,
      messages,
      max_tokens: invocation.maxTokens,
      temperature: invocation.temperature ?? 0.2,
    };
    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: Buffer.from(JSON.stringify(payload)),
    });
    const resp = await client.send(command);
    const bodyText = new TextDecoder().decode(resp.body as Uint8Array);
    const parsed = JSON.parse(bodyText) as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };
    const text = parsed.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");
    return {
      text,
      inputTokens: parsed.usage.input_tokens,
      outputTokens: parsed.usage.output_tokens,
      latencyMs: Date.now() - start,
      provider,
      modelId,
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Claude driver: ANTHROPIC_API_KEY not set for direct fallback");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      system: invocation.system,
      messages,
      max_tokens: invocation.maxTokens,
      temperature: invocation.temperature ?? 0.2,
    }),
  });
  if (!resp.ok) {
    throw new Error(`Claude direct API error ${resp.status}: ${await resp.text()}`);
  }
  const parsed = (await resp.json()) as {
    content: Array<{ type: string; text: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };
  const text = parsed.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
  return {
    text,
    inputTokens: parsed.usage.input_tokens,
    outputTokens: parsed.usage.output_tokens,
    latencyMs: Date.now() - start,
    provider,
    modelId,
  };
}
