import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: vi.fn().mockImplementation(function BedrockRuntimeClient() {
    return { send: sendMock };
  }),
  InvokeModelCommand: vi.fn().mockImplementation(function InvokeModelCommand(input: unknown) {
    return input;
  }),
}));

import { invokeClaude } from "@/lib/llm/anthropic-driver";

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  sendMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env = { ...ORIG_ENV };
});

afterEach(() => {
  process.env = ORIG_ENV;
  vi.unstubAllGlobals();
});

describe("invokeClaude", () => {
  it("BEDROCK_ENABLED=true + missing model id throws clear message", async () => {
    process.env.BEDROCK_ENABLED = "true";
    delete process.env.BEDROCK_MODEL_SONNET_PRIMARY;
    await expect(
      invokeClaude({ tier: "primary", system: "s", messages: [{ role: "user", content: "hi" }], maxTokens: 10 }),
    ).rejects.toThrow(/model id not configured/);
  });

  it("BEDROCK_ENABLED=false + missing ANTHROPIC_API_KEY throws", async () => {
    process.env.BEDROCK_ENABLED = "false";
    process.env.ANTHROPIC_MODEL_SONNET_PRIMARY = "claude-sonnet";
    delete process.env.ANTHROPIC_API_KEY;
    await expect(
      invokeClaude({ tier: "primary", system: "s", messages: [{ role: "user", content: "hi" }], maxTokens: 10 }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it("bedrock path sends anthropic_version payload shape", async () => {
    process.env.BEDROCK_ENABLED = "true";
    process.env.BEDROCK_MODEL_SONNET_PRIMARY = "anthropic.claude-sonnet";
    sendMock.mockResolvedValue({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: "ok" }],
          usage: { input_tokens: 5, output_tokens: 3 },
        }),
      ),
    });
    const result = await invokeClaude({
      tier: "primary",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 100,
      temperature: 0.1,
    });
    const cmd = sendMock.mock.calls[0][0] as { body: Buffer };
    const payload = JSON.parse(cmd.body.toString());
    expect(payload.anthropic_version).toBe("bedrock-2023-05-31");
    expect(payload.system).toBe("sys");
    expect(payload.messages[0].content[0].text).toBe("hello");
    expect(payload.max_tokens).toBe(100);
    expect(result.provider).toBe("bedrock");
    expect(result.modelId).toBe("anthropic.claude-sonnet");
    expect(result.text).toBe("ok");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("direct API path calls anthropic URL with headers", async () => {
    process.env.BEDROCK_ENABLED = "false";
    process.env.ANTHROPIC_API_KEY = "key-123";
    process.env.ANTHROPIC_MODEL_SONNET_PRIMARY = "claude-sonnet-4";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "direct" }],
        usage: { input_tokens: 2, output_tokens: 4 },
      }),
    });
    const result = await invokeClaude({
      tier: "primary",
      system: "sys",
      messages: [{ role: "user", content: "q" }],
      maxTokens: 50,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "key-123",
          "anthropic-version": "2023-06-01",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("claude-sonnet-4");
    expect(result.provider).toBe("anthropic_direct");
    expect(result.text).toBe("direct");
  });

  it("direct API non-2xx throws with response body", async () => {
    process.env.BEDROCK_ENABLED = "false";
    process.env.ANTHROPIC_API_KEY = "key";
    process.env.ANTHROPIC_MODEL_SONNET_PRIMARY = "claude";
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    });
    await expect(
      invokeClaude({ tier: "primary", system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 1 }),
    ).rejects.toThrow(/429.*rate limited/);
  });

  it("haiku tier picks BEDROCK_MODEL_HAIKU", async () => {
    process.env.BEDROCK_ENABLED = "true";
    process.env.BEDROCK_MODEL_HAIKU = "haiku-model";
    sendMock.mockResolvedValue({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: "h" }],
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      ),
    });
    const result = await invokeClaude({
      tier: "haiku",
      system: "s",
      messages: [{ role: "user", content: "x" }],
      maxTokens: 1,
    });
    expect(result.modelId).toBe("haiku-model");
  });
});
