import { describe, test, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import crypto from "crypto";

const ediFixture = readFileSync(
  path.join(process.cwd(), "lib/ar-cash-app/parsers/__fixtures__/edi-820-sample.edi"),
  "utf8",
);

const mockDispatchMessage = vi.fn();
const mockPublishEvent = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/intake/dispatch", () => ({
  dispatchMessage: (...args: unknown[]) => mockDispatchMessage(...args),
}));

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: (...args: unknown[]) => mockPublishEvent(...args),
}));

import { POST } from "@/app/api/webhooks/postmark/inbound/route";
import { cashAppRemitHandler } from "@/lib/intake/handlers/cash-app-remit";
import type { IntakeHandlerContext } from "@/lib/intake/types";

function hmac(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

function intakeMessagesMock(handlers: {
  dedupExisting?: { id: string; dispatch_status: string } | null;
  contentMatch?: { id: string } | null;
  onInsert?: () => Record<string, unknown>;
}) {
  return {
    select: () => ({
      eq: (_col: string, _val: unknown) => ({
        maybeSingle: async () => {
          if (_col === "dedup_key") {
            return { data: handlers.dedupExisting ?? null, error: null };
          }
          return { data: handlers.contentMatch ?? null, error: null };
        },
        limit: () => ({
          maybeSingle: async () => ({ data: handlers.contentMatch ?? null, error: null }),
        }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: handlers.onInsert?.() ?? { id: "intake-1" },
          error: null,
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.POSTMARK_INBOUND_WEBHOOK_SECRET = "test-hmac-secret";
  mockPublishEvent.mockResolvedValue({ eventId: "evt-1" });
  mockDispatchMessage.mockResolvedValue({
    handlerKey: null,
    outcome: "no_handler",
    detail: { reason: "synthetic" },
  });
});

describe("POST /api/webhooks/postmark/inbound", () => {
  test("returns 500 when webhook secret is not configured", async () => {
    delete process.env.POSTMARK_INBOUND_WEBHOOK_SECRET;
    const req = new NextRequest("http://localhost/api/webhooks/postmark/inbound", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  test("returns 401 without valid HMAC or Postmark IP", async () => {
    const body = JSON.stringify({ MessageID: "m1", From: "a@b.com", Subject: "s", Date: "2026-07-06" });
    const req = new NextRequest("http://localhost/api/webhooks/postmark/inbound", {
      method: "POST",
      body,
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("returns 400 for invalid JSON", async () => {
    const body = "not-json";
    const sig = encodeURIComponent(hmac(body, "test-hmac-secret"));
    const req = new NextRequest(`http://localhost/api/webhooks/postmark/inbound?sig=${sig}`, {
      method: "POST",
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("dedups on identical MessageID", async () => {
    const body = JSON.stringify({
      MessageID: "dup-1",
      From: "a@b.com",
      Subject: "s",
      Date: "2026-07-06T04:00:00Z",
    });
    const sig = encodeURIComponent(hmac(body, "test-hmac-secret"));
    mockFrom.mockReturnValue(
      intakeMessagesMock({
        dedupExisting: { id: "existing-msg", dispatch_status: "no_handler" },
      }),
    );
    const req = new NextRequest(`http://localhost/api/webhooks/postmark/inbound?sig=${sig}`, {
      method: "POST",
      body,
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.deduped).toBe(true);
    expect(json.intake_message_id).toBe("existing-msg");
    expect(mockDispatchMessage).not.toHaveBeenCalled();
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "intake_message_deduped" }),
      expect.anything(),
    );
  });

  test("accepts Postmark IP without HMAC signature", async () => {
    const body = JSON.stringify({
      MessageID: "ip-1",
      From: "a@b.com",
      Subject: "s",
      Date: "2026-07-06T04:00:00Z",
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "intake_messages") {
        return intakeMessagesMock({
          onInsert: () => ({
            id: "intake-ip",
            source_channel: "postmark_inbound",
            source_message_id: "ip-1",
            content_hash: "hash",
          }),
        });
      }
      if (table === "intake_attachments") {
        return { insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      }
      return intakeMessagesMock({});
    });
    const req = new NextRequest("http://localhost/api/webhooks/postmark/inbound", {
      method: "POST",
      body,
      headers: { "x-forwarded-for": "3.134.147.250" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test("flags content-hash duplicate while still inserting", async () => {
    const payload = {
      MessageID: "content-dup-1",
      From: "a@b.com",
      Subject: "same",
      TextBody: "body",
      Date: "2026-07-06T04:00:00Z",
    };
    const body = JSON.stringify(payload);
    const sig = encodeURIComponent(hmac(body, "test-hmac-secret"));
    mockFrom.mockImplementation((table: string) => {
      if (table === "intake_messages") {
        return intakeMessagesMock({
          contentMatch: { id: "prior-msg" },
          onInsert: () => ({
            id: "intake-dup-content",
            source_channel: "postmark_inbound",
            source_message_id: payload.MessageID,
            content_hash: "hash",
            is_duplicate: true,
            duplicate_of: "prior-msg",
          }),
        });
      }
      if (table === "intake_attachments") {
        return { insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      }
      return intakeMessagesMock({});
    });
    const req = new NextRequest(`http://localhost/api/webhooks/postmark/inbound?sig=${sig}`, {
      method: "POST",
      body,
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.is_duplicate).toBe(true);
  });

  test("happy path inserts message, attachments, dispatches", async () => {
    const attachmentB64 = Buffer.from(ediFixture, "utf8").toString("base64");
    const payload = {
      MessageID: "msg-happy-1",
      From: "payer@acme.com",
      FromFull: { Email: "payer@acme.com" },
      Subject: "Remittance",
      TextBody: "See attached",
      Date: "2026-07-06T04:00:00Z",
      To: "remit+acme-abc123@intake.advisacor.com",
      OriginalRecipient: "remit+acme-abc123@intake.advisacor.com",
      Attachments: [
        {
          Name: "remit.edi",
          Content: attachmentB64,
          ContentType: "text/plain",
          ContentLength: ediFixture.length,
        },
      ],
    };
    const body = JSON.stringify(payload);
    const sig = encodeURIComponent(hmac(body, "test-hmac-secret"));

    let intakeInsertCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "intake_messages") {
        return intakeMessagesMock({
          onInsert: () => {
            intakeInsertCount += 1;
            return {
              id: "intake-1",
              source_channel: "postmark_inbound",
              source_message_id: payload.MessageID,
              content_hash: "hash",
            };
          },
        });
      }
      if (table === "intake_attachments") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: "att-1",
                  filename: "remit.edi",
                  content_type: "text/plain",
                  content_length: ediFixture.length,
                  content_sha256: "sha",
                  content_base64: attachmentB64,
                  is_duplicate_of: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return intakeMessagesMock({});
    });

    const req = new NextRequest(`http://localhost/api/webhooks/postmark/inbound?sig=${sig}`, {
      method: "POST",
      body,
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.intake_message_id).toBe("intake-1");
    expect(intakeInsertCount).toBe(1);
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "intake_message_received" }),
      expect.anything(),
    );
    expect(mockDispatchMessage).toHaveBeenCalled();
  });
});

describe("cashAppRemitHandler", () => {
  function makeHandlerSupabase(state: {
    existingRemittance: { id: string } | null;
    insertRemittance: Record<string, unknown>;
    lineInserts: Array<Record<string, unknown>>;
  }) {
    return {
      from: (table: string) => {
        if (table === "ar_cash_app_remittances") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.existingRemittance, error: null }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: state.insertRemittance, error: null }),
              }),
            }),
          };
        }
        if (table === "ar_cash_app_remittance_lines") {
          return {
            insert: async (rows: Array<Record<string, unknown>>) => {
              state.lineInserts.push(...rows);
              return { error: null };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as IntakeHandlerContext["supabase"];
  }

  test("parses canonical EDI 820 fixture and inserts two lines", async () => {
    const lineInserts: Array<Record<string, unknown>> = [];
    const supabase = makeHandlerSupabase({
      existingRemittance: null,
      insertRemittance: { id: "rem-edi-1" },
      lineInserts,
    });
    const attachmentB64 = Buffer.from(ediFixture, "utf8").toString("base64");
    const ctx: IntakeHandlerContext = {
      supabase,
      message: {
        id: "intake-edi",
        firm_id: "firm-1",
        company_id: "co-1",
        firm_client_id: "fc-1",
        source_channel: "postmark_inbound",
        source_message_id: "pm-edi-1",
        recipient_address: null,
        recipient_prefix: null,
        recipient_firm_slug: null,
        recipient_token: null,
        sender_email: "payer@acme.com",
        sender_domain: "acme.com",
        subject: "Remit",
        received_at: "2026-07-06T04:00:00Z",
        raw_body_text: null,
        raw_body_html: null,
        raw_headers: null,
        raw_payload: {},
        content_hash: "h1",
      },
      attachments: [
        {
          id: "att-1",
          filename: "remit.edi",
          content_type: "text/plain",
          content_length: ediFixture.length,
          content_sha256: "sha",
          content_base64: attachmentB64,
          is_duplicate_of: null,
        },
      ],
    };

    const outcome = await cashAppRemitHandler.handle(ctx);
    expect(outcome.status).toBe("success");
    if (outcome.status === "success") {
      expect(outcome.detail.parse_status).toBe("parsed");
      expect(outcome.detail.lines).toBe(2);
    }
    expect(lineInserts).toHaveLength(2);
    expect(lineInserts[0].invoice_reference).toBe("INV-4521");
    expect(lineInserts[1].invoice_reference).toBe("INV-4522");
  });

  test("dedups when remittance dedup_hash already exists", async () => {
    const supabase = makeHandlerSupabase({
      existingRemittance: { id: "rem-existing" },
      insertRemittance: { id: "rem-new" },
      lineInserts: [],
    });
    const outcome = await cashAppRemitHandler.handle({
      supabase,
      message: {
        id: "intake-2",
        firm_id: "firm-1",
        company_id: "co-1",
        firm_client_id: null,
        source_channel: "postmark_inbound",
        source_message_id: "pm-dup",
        recipient_address: null,
        recipient_prefix: null,
        recipient_firm_slug: null,
        recipient_token: null,
        sender_email: null,
        sender_domain: null,
        subject: null,
        received_at: "2026-07-06",
        raw_body_text: null,
        raw_body_html: null,
        raw_headers: null,
        raw_payload: {},
        content_hash: "h2",
      },
      attachments: [],
    });
    expect(outcome.status).toBe("success");
    if (outcome.status === "success") {
      expect(outcome.detail.deduped).toBe(true);
      expect(outcome.detail.remittance_id).toBe("rem-existing");
    }
  });

  test("sets intake_message_id on remittance insert", async () => {
    const capture = { insertedRow: null as { intake_message_id?: string } | null };
    const supabase = {
      from: (table: string) => {
        if (table === "ar_cash_app_remittances") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            insert: (row: Record<string, unknown>) => {
              capture.insertedRow = row as { intake_message_id?: string };
              return {
                select: () => ({
                  single: async () => ({ data: { id: "rem-3" }, error: null }),
                }),
              };
            },
          };
        }
        if (table === "ar_cash_app_remittance_lines") {
          return { insert: async () => ({ error: null }) };
        }
        throw new Error(table);
      },
    } as unknown as IntakeHandlerContext["supabase"];

    vi.mocked(mockPublishEvent).mockResolvedValue({ eventId: "e" });
    await cashAppRemitHandler.handle({
      supabase,
      message: {
        id: "intake-link",
        firm_id: "firm-1",
        company_id: "co-1",
        firm_client_id: null,
        source_channel: "postmark_inbound",
        source_message_id: "pm-link",
        recipient_address: null,
        recipient_prefix: null,
        recipient_firm_slug: null,
        recipient_token: null,
        sender_email: null,
        sender_domain: null,
        subject: "s",
        received_at: "2026-07-06",
        raw_body_text: ediFixture,
        raw_body_html: null,
        raw_headers: null,
        raw_payload: {},
        content_hash: "h3",
      },
      attachments: [],
    });
    expect(capture.insertedRow?.intake_message_id).toBe("intake-link");
  });
});
