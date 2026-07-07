import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntitlementDenied } from "@/lib/entitlements/gate";

vi.mock("@/lib/ai/action-logger", () => ({
  logAiAction: vi.fn().mockResolvedValue({ actionId: "a1", eventId: "e1" }),
}));

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn().mockResolvedValue({ eventId: "evt-1" }),
}));

vi.mock("@/lib/entitlements/gate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/entitlements/gate")>();
  return {
    ...actual,
    assertEntitlement: vi.fn(actual.assertEntitlement),
  };
});

import { assertEntitlement } from "@/lib/entitlements/gate";
import { handleBills } from "@/lib/intake/handlers/bills";
import type { IntakeHandlerContext } from "@/lib/intake/types";

const mockAssert = vi.mocked(assertEntitlement);

function makeCtx(): IntakeHandlerContext {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const supabase = {
    from: (table: string) => {
      if (table === "ap_intake_quarantine") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            inserts.push({ table, row });
            return {
              select: () => ({
                single: async () => ({ data: { id: "q-gate-1" }, error: null }),
              }),
            };
          },
        };
      }
      if (table === "vendor_master_mirror") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: { id: "eng-1" }, error: null }),
              }),
              order: () => ({
                limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
              }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          return {
            select: () => ({
              single: async () => ({ data: { id: "bill-1" }, error: null }),
            }),
          };
        },
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    },
    _inserts: inserts,
  };
  return {
    supabase: supabase as never,
    message: {
      id: "msg-1",
      firm_id: "firm-1",
      company_id: "co-1",
      firm_client_id: "fc-1",
      source_channel: "postmark_inbound",
      source_message_id: "pm-1",
      recipient_address: null,
      recipient_prefix: null,
      recipient_firm_slug: null,
      recipient_token: null,
      sender_email: "v@example.com",
      sender_domain: "example.com",
      subject: "Invoice",
      received_at: "2026-07-06T04:00:00Z",
      raw_body_text: "Invoice 123",
      raw_body_html: null,
      raw_headers: null,
      raw_payload: {},
      content_hash: "hash",
    },
    attachments: [
      {
        id: "att-1",
        filename: "bill.pdf",
        content_type: "application/pdf",
        content_length: 10,
        content_sha256: "sha",
        content_base64: Buffer.from("pdf").toString("base64"),
        is_duplicate_of: null,
      },
    ],
  };
}

describe("ap_intake entitlement gate on bills handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws EntitlementDenied when ap_intake is denied", async () => {
    const ctx = makeCtx();
    mockAssert.mockRejectedValueOnce(
      new EntitlementDenied("ap_intake", "eng-1", "inactive"),
    );
    await expect(handleBills(ctx)).rejects.toBeInstanceOf(EntitlementDenied);
    expect((ctx.supabase as { _inserts: unknown[] })._inserts.length).toBe(0);
  });

  it("proceeds when ap_intake entitlement passes", async () => {
    mockAssert.mockResolvedValueOnce(undefined);
    const result = await handleBills(makeCtx());
    expect(result.status).toBe("success");
    expect(mockAssert).toHaveBeenCalledWith(
      "ap_intake",
      "eng-1",
      expect.objectContaining({ caller: "bills_handler" }),
    );
  });
});
