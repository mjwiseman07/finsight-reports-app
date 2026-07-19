import { describe, it, expect, vi, beforeEach } from "vitest";

const store: {
  qbo: Record<string, unknown> | null;
  cdcRuns: Record<string, unknown>[];
  audit: Record<string, unknown>[];
  tickets: Record<string, unknown> | null;
} = {
  qbo: null,
  cdcRuns: [],
  audit: [],
  tickets: null,
};

vi.mock("../../lib/supabase", () => {
  const from = vi.fn((tbl: string) => {
    if (tbl === "qbo_connections_unified") {
      return {
        select: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: store.qbo, error: null }),
            }),
            // for checkCdcHealth list path
            then: undefined,
          }),
        }),
      };
    }
    if (tbl === "qbo_cdc_runs") {
      return {
        select: () => ({
          in: () => ({
            gte: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: store.cdcRuns, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    if (tbl === "audit_logs") {
      return {
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: store.audit, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    if (tbl === "support_tickets") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              gte: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: store.tickets, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    return {};
  });

  // Override qbo_connections_unified to support both maybeSingle and array select
  const fromWrapped = vi.fn((tbl: string) => {
    if (tbl === "qbo_connections_unified") {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.limit = () => chain;
      chain.maybeSingle = () => Promise.resolve({ data: store.qbo, error: null });
      // When awaited without maybeSingle (cdc path), resolve as array
      chain.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: store.qbo ? [store.qbo] : [], error: null });
      return chain;
    }
    return from(tbl);
  });

  return { supabaseAdmin: { from: fromWrapped } };
});

import { collectWorkflowSignals } from "../../lib/support/workflow-signals";

describe("collectWorkflowSignals", () => {
  beforeEach(() => {
    store.qbo = null;
    store.cdcRuns = [];
    store.audit = [];
    store.tickets = null;
  });

  it("sanitizes unsafe context params", async () => {
    const bundle = await collectWorkflowSignals({
      userId: "11111111-1111-1111-1111-111111111111",
      contextParam: "<script>alert(1)</script>",
    });
    expect(bundle.contextParam).toBeNull();
    expect(bundle.signals.find((s) => s.kind === "referrer_context")).toBeUndefined();
  });

  it("accepts safe context params", async () => {
    const bundle = await collectWorkflowSignals({
      userId: "11111111-1111-1111-1111-111111111111",
      contextParam: "dashboard_error_boundary",
    });
    expect(bundle.contextParam).toBe("dashboard_error_boundary");
    expect(bundle.signals.some((s) => s.kind === "referrer_context")).toBe(true);
  });

  it("surfaces missing QBO connection", async () => {
    store.qbo = null;
    const bundle = await collectWorkflowSignals({
      userId: "11111111-1111-1111-1111-111111111111",
    });
    expect(bundle.signals.some((s) => s.kind === "qbo_connection_missing")).toBe(true);
  });

  it("surfaces expired QBO token", async () => {
    store.qbo = {
      realm_id: "123",
      status: "connected",
      token_expiry: new Date(Date.now() - 60_000).toISOString(),
    };
    const bundle = await collectWorkflowSignals({
      userId: "11111111-1111-1111-1111-111111111111",
    });
    expect(bundle.signals.some((s) => s.kind === "qbo_connection_expired")).toBe(true);
  });

  it("surfaces recent auto-filed ticket", async () => {
    store.qbo = { realm_id: "123", status: "connected", token_expiry: new Date(Date.now() + 3600_000).toISOString() };
    store.tickets = {
      id: "tkt-1",
      ticket_number: 42,
      error_class: "qbo.auth.token_expired",
      correlation_id: "corr-1",
      created_at: new Date().toISOString(),
    };
    const bundle = await collectWorkflowSignals({
      userId: "11111111-1111-1111-1111-111111111111",
    });
    expect(bundle.mostRecentAutoFiledTicket?.ticket_id).toBe("tkt-1");
    expect(bundle.signals.some((s) => s.kind === "recent_auto_filed_ticket")).toBe(true);
  });
});
