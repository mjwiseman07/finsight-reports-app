import { describe, test, expect, vi, beforeEach } from "vitest";
import type { IntakeAttachmentRecord, IntakeMessageRecord } from "../types";

vi.mock("../classifier", () => ({
  classifyIntakeMessage: vi.fn(),
}));

vi.mock("../handlers", () => ({
  getHandler: vi.fn(),
  listHandlers: vi.fn(),
}));

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn().mockResolvedValue({ eventId: "evt-1" }),
}));

vi.mock("../address", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../address")>();
  return {
    ...actual,
    verifyToken: vi.fn(actual.verifyToken),
  };
});

import { classifyIntakeMessage } from "../classifier";
import { getHandler } from "../handlers";
import { publishEvent } from "@/lib/events/publisher";
import { verifyToken } from "../address";
import { dispatchMessage } from "../dispatch";

const mockClassify = vi.mocked(classifyIntakeMessage);
const mockGetHandler = vi.mocked(getHandler);
const mockPublish = vi.mocked(publishEvent);
const mockVerifyToken = vi.mocked(verifyToken);

interface MockState {
  firmIntakeAddresses: Record<string, unknown> | null;
  customers: Record<string, unknown> | null;
  firmClients: Record<string, unknown> | null;
  firmIntakeHandlers: Record<string, unknown> | null;
  engagementAddons: Array<{ is_active: boolean }>;
  intakeMessagesUpdates: Array<Record<string, unknown>>;
  dispatchLogInserts: Array<Record<string, unknown>>;
  handlerOutcome: { status: string; detail?: Record<string, unknown>; error?: string };
}

function baseMessage(overrides: Partial<IntakeMessageRecord> = {}): IntakeMessageRecord {
  return {
    id: "msg-1",
    firm_id: null,
    company_id: null,
    firm_client_id: null,
    source_channel: "postmark_inbound",
    source_message_id: "pm-1",
    recipient_address: "remit+acme-abc123@intake.advisacor.com",
    recipient_prefix: "remit",
    recipient_firm_slug: "acme",
    recipient_token: "abc123",
    sender_email: "payer@example.com",
    sender_domain: "example.com",
    subject: "Payment",
    received_at: "2026-07-06T04:00:00Z",
    raw_body_text: "hello",
    raw_body_html: null,
    raw_headers: null,
    raw_payload: {},
    content_hash: "hash-1",
    ...overrides,
  };
}

function makeMockSupabase(state: Partial<MockState> = {}) {
  const s: MockState = {
    firmIntakeAddresses: {
      firm_id: "firm-1",
      company_id: "co-1",
      token: "abc123",
    },
    customers: null,
    firmClients: { id: "fc-1" },
    firmIntakeHandlers: { enabled: true, required_entitlement: "ar_cash_app" },
    engagementAddons: [],
    intakeMessagesUpdates: [],
    dispatchLogInserts: [],
    handlerOutcome: { status: "success", detail: { remittance_id: "rem-1" } },
    ...state,
  };

  return {
    _state: s,
    from: (table: string) => {
      if (table === "firm_intake_addresses") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: s.firmIntakeAddresses, error: null }),
                }),
              }),
            }),
            limit: () => ({
              maybeSingle: async () => ({ data: s.firmIntakeAddresses, error: null }),
            }),
          }),
        };
      }
      if (table === "customers") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: s.customers, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "firm_clients") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: s.firmClients, error: null }),
            }),
          }),
        };
      }
      if (table === "firm_intake_handlers") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: s.firmIntakeHandlers, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "engagements") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: [{ id: "eng-1" }], error: null }),
            }),
          }),
        };
      }
      if (table === "engagement_addons") {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({ data: s.engagementAddons, error: null }),
            }),
          }),
        };
      }
      if (table === "intake_messages") {
        return {
          update: (fields: Record<string, unknown>) => ({
            eq: async () => {
              s.intakeMessagesUpdates.push(fields);
              return { error: null };
            },
          }),
        };
      }
      if (table === "intake_dispatch_log") {
        return {
          insert: async (row: Record<string, unknown>) => {
            s.dispatchLogInserts.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient & { _state: MockState };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INTAKE_ADDRESS_TOKEN_SECRET = "test-secret-please-rotate-in-prod-abc1234567890";
  mockVerifyToken.mockReturnValue(true);
  mockGetHandler.mockReturnValue({
    key: "cash_app_remit",
    requiredEntitlement: "ar_cash_app",
    handle: vi.fn().mockImplementation(async () => ({
      status: "success",
      detail: { remittance_id: "rem-1" },
    })),
  });
});

describe("dispatchMessage", () => {
  test("address_matched dispatches registered handler", async () => {
    const supabase = makeMockSupabase();
    const result = await dispatchMessage(supabase, baseMessage(), []);
    expect(result.handlerKey).toBe("cash_app_remit");
    expect(result.outcome).toBe("success");
    expect(mockGetHandler).toHaveBeenCalledWith("cash_app_remit");
    expect(supabase._state.intakeMessagesUpdates.some((u) => u.dispatch_status === "handler_success")).toBe(true);
  });

  test("token_verification_failed routes to no_handler", async () => {
    mockVerifyToken.mockReturnValue(false);
    const supabase = makeMockSupabase({ firmIntakeAddresses: { firm_id: "f1", company_id: "c1", token: "bad" } });
    const result = await dispatchMessage(supabase, baseMessage(), []);
    expect(result.outcome).toBe("no_handler");
    expect(mockGetHandler).not.toHaveBeenCalled();
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "intake_message_no_handler" }),
      supabase,
    );
  });

  test("sender_domain_matched dispatches cash_app_remit", async () => {
    mockVerifyToken.mockReturnValue(false);
    const supabase = makeMockSupabase({
      firmIntakeAddresses: null,
      customers: { firm_id: "firm-2", company_id: "co-2" },
      firmClients: { id: "fc-2" },
      firmIntakeHandlers: { enabled: true, required_entitlement: "ar_cash_app" },
    });
    const result = await dispatchMessage(
      supabase,
      baseMessage({ recipient_address: "intake@intake.advisacor.com", sender_domain: "acme.com" }),
      [],
    );
    expect(result.handlerKey).toBe("cash_app_remit");
    expect(result.outcome).toBe("success");
  });

  test("classifier_matched dispatches when address and domain fail", async () => {
    mockVerifyToken.mockReturnValue(false);
    mockClassify.mockResolvedValueOnce({
      handlerKey: "docs",
      confidence: 0.9,
      floor: 0.7,
      firmId: "firm-3",
      companyId: "co-3",
      firmClientId: "fc-3",
    });
    const supabase = makeMockSupabase({
      firmIntakeAddresses: null,
      customers: null,
      firmClients: { id: "fc-3" },
      firmIntakeHandlers: { enabled: true, required_entitlement: null },
    });
    mockGetHandler.mockReturnValue({
      key: "docs",
      requiredEntitlement: null,
      handle: vi.fn().mockResolvedValue({ status: "skipped_not_applicable", reason: "not implemented" }),
    });
    const result = await dispatchMessage(supabase, baseMessage(), []);
    expect(result.handlerKey).toBe("docs");
    expect(mockClassify).toHaveBeenCalled();
  });

  test("unresolved sets dispatch_status no_handler", async () => {
    mockVerifyToken.mockReturnValue(false);
    mockClassify.mockResolvedValueOnce(null);
    const supabase = makeMockSupabase({ firmIntakeAddresses: null, customers: null });
    const result = await dispatchMessage(supabase, baseMessage(), []);
    expect(result.outcome).toBe("no_handler");
    expect(supabase._state.intakeMessagesUpdates.some((u) => u.dispatch_status === "no_handler")).toBe(true);
  });

  test("handler disabled yields skipped_disabled", async () => {
    const supabase = makeMockSupabase({
      firmIntakeHandlers: { enabled: false, required_entitlement: "ar_cash_app" },
    });
    const result = await dispatchMessage(supabase, baseMessage(), []);
    expect(result.outcome).toBe("skipped_disabled");
    expect(supabase._state.dispatchLogInserts[0]?.outcome).toBe("skipped_disabled");
  });

  test("missing entitlement yields skipped_no_entitlement", async () => {
    const supabase = makeMockSupabase({
      engagementAddons: [{ is_active: false }],
    });
    const result = await dispatchMessage(supabase, baseMessage(), []);
    expect(result.outcome).toBe("skipped_no_entitlement");
    expect(supabase._state.dispatchLogInserts[0]?.outcome).toBe("skipped_no_entitlement");
  });

  test("publishes intake_message_dispatched before handler runs", async () => {
    const supabase = makeMockSupabase();
    await dispatchMessage(supabase, baseMessage(), []);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "intake_message_dispatched", eventCategory: "intake" }),
      supabase,
    );
  });

  test("handler failure records handler_failed status", async () => {
    mockGetHandler.mockReturnValue({
      key: "cash_app_remit",
      requiredEntitlement: "ar_cash_app",
      handle: vi.fn().mockResolvedValue({ status: "failed", error: "boom" }),
    });
    const supabase = makeMockSupabase();
    const result = await dispatchMessage(supabase, baseMessage(), []);
    expect(result.outcome).toBe("failed");
    expect(supabase._state.intakeMessagesUpdates.some((u) => u.dispatch_status === "handler_failed")).toBe(true);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "intake_message_handler_failed" }),
      supabase,
    );
  });

  test("address_not_provisioned routes to no_handler", async () => {
    mockVerifyToken.mockReturnValue(false);
    const supabase = makeMockSupabase({ firmIntakeAddresses: null, customers: null });
    const result = await dispatchMessage(
      supabase,
      baseMessage({ recipient_address: "remit+unknown-abc123@intake.advisacor.com" }),
      [],
    );
    expect(result.outcome).toBe("no_handler");
  });

  test("records dispatch log with duration on success", async () => {
    const supabase = makeMockSupabase();
    await dispatchMessage(supabase, baseMessage(), []);
    expect(supabase._state.dispatchLogInserts[0]).toMatchObject({
      handler_key: "cash_app_remit",
      outcome: "success",
    });
    expect(typeof supabase._state.dispatchLogInserts[0]?.duration_ms).toBe("number");
  });

  test("updates message with resolution fields before dispatch", async () => {
    const supabase = makeMockSupabase();
    await dispatchMessage(supabase, baseMessage(), []);
    expect(supabase._state.intakeMessagesUpdates[0]).toMatchObject({
      firm_id: "firm-1",
      company_id: "co-1",
      recipient_resolution: "address_matched",
      dispatch_handler_key: "cash_app_remit",
    });
  });
});
