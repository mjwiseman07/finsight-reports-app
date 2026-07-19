import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeClaude = vi.fn();

vi.mock("../../lib/llm/anthropic-driver", () => ({
  invokeClaude: (...args: unknown[]) => invokeClaude(...args),
}));

import { composePrefillDraft } from "../../lib/support/prefill-composer";
import type { WorkflowSignalBundle } from "../../lib/support/workflow-signals";

function baseBundle(overrides: Partial<WorkflowSignalBundle> = {}): WorkflowSignalBundle {
  return {
    userId: "11111111-1111-1111-1111-111111111111",
    signals: [],
    mostRecentAutoFiledTicket: null,
    contextParam: null,
    ...overrides,
  };
}

describe("composePrefillDraft", () => {
  beforeEach(() => {
    invokeClaude.mockReset();
  });

  it("returns null when there are no signals and no context", async () => {
    const draft = await composePrefillDraft(baseBundle());
    expect(draft).toBeNull();
    expect(invokeClaude).not.toHaveBeenCalled();
  });

  it("builds a static draft for context-only bundles (no Haiku call)", async () => {
    const draft = await composePrefillDraft(
      baseBundle({
        contextParam: "dashboard_error_boundary",
        signals: [
          {
            kind: "referrer_context",
            severity: "low",
            observedAt: new Date().toISOString(),
            detail: { raw: "dashboard_error_boundary" },
          },
        ],
      }),
    );
    expect(draft).not.toBeNull();
    expect(draft?.subject).toContain("dashboard_error_boundary");
    expect(draft?.confidence).toBe("low");
    expect(invokeClaude).not.toHaveBeenCalled();
  });

  it("parses Haiku JSON into a validated draft", async () => {
    invokeClaude.mockResolvedValueOnce({
      text: JSON.stringify({
        subject: "My QuickBooks connection needs a refresh",
        description: "I was trying to run a review and Advisacor said my QuickBooks connection needs attention.",
        category: "Bug Report",
        priority: "High",
        confidence: "high",
      }),
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: 50,
      provider: "bedrock",
      modelId: "haiku",
    });

    const draft = await composePrefillDraft(
      baseBundle({
        signals: [
          {
            kind: "qbo_connection_expired",
            severity: "high",
            observedAt: new Date().toISOString(),
            detail: { realm_id: "123" },
          },
        ],
        mostRecentAutoFiledTicket: {
          ticket_id: "tkt-1",
          ticket_number: 7,
          error_class: "qbo.auth.token_expired",
          correlation_id: "corr-xyz",
          created_at: new Date().toISOString(),
        },
      }),
    );

    expect(draft?.subject).toMatch(/QuickBooks/i);
    expect(draft?.category).toBe("Bug Report");
    expect(draft?.priority).toBe("High");
    expect(draft?.attribution.parent_ticket_id).toBe("tkt-1");
    expect(draft?.attribution.parent_correlation_id).toBe("corr-xyz");
  });

  it("returns null when Haiku returns non-JSON", async () => {
    invokeClaude.mockResolvedValueOnce({
      text: "not json at all",
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 10,
      provider: "bedrock",
      modelId: "haiku",
    });
    const draft = await composePrefillDraft(
      baseBundle({
        signals: [
          {
            kind: "qbo_connection_expired",
            severity: "high",
            observedAt: new Date().toISOString(),
            detail: {},
          },
        ],
      }),
    );
    expect(draft).toBeNull();
  });

  it("returns null when Haiku throws / times out", async () => {
    invokeClaude.mockRejectedValueOnce(new Error("haiku_timeout"));
    const draft = await composePrefillDraft(
      baseBundle({
        signals: [
          {
            kind: "cdc_stalled",
            severity: "high",
            observedAt: new Date().toISOString(),
            detail: {},
          },
        ],
      }),
    );
    expect(draft).toBeNull();
  });
});
