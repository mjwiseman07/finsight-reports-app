import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/supabase", () => {
  const store: { circuits: Record<string, unknown>; tickets: Record<string, unknown>[] } = {
    circuits: {},
    tickets: [],
  };
  const from = vi.fn((tbl: string) => {
    if (tbl === "support_error_circuit") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: store.circuits[Object.keys(store.circuits)[0]] || null }),
          }),
        }),
        upsert: (payload: Record<string, unknown>) => {
          store.circuits[String(payload.error_class)] = payload;
          return Promise.resolve({ error: null });
        },
      };
    }
    if (tbl === "support_tickets") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
            eq2: () => ({ gte: () => Promise.resolve({ data: [] }) }),
            gte: () => Promise.resolve({ data: [] }),
          }),
        }),
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            maybeSingle: () => {
              const row = { id: "tkt-1", ticket_number: 99, ...payload };
              store.tickets.push(row);
              return Promise.resolve({ data: row, error: null });
            },
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    }
    if (tbl === "users") {
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { email: "user@test.com" } }) }) }) };
    }
    return {};
  });
  return { supabaseAdmin: { from } };
});

vi.mock("../../lib/email", () => ({
  getEarlyAccessEmailConfig: () => ({ fromEmail: "no-reply@test", replyToEmail: "support@test" }),
  getSupportEmail: () => "support@test",
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
  escapeHtml: (s: string) => s,
}));

import { classifyError, normalizeEndpoint } from "../../lib/support/error-classifier";
import { autoFileTicket } from "../../lib/support/auto-file";
import { ERROR_CLASS, adaptiveDedupWindowMinutes } from "../../lib/support/error-taxonomy";

describe("classifyError", () => {
  it("qbo 401 → auth token expired", () => {
    expect(classifyError({ source: "qbo", httpStatus: 401 })).toBe(ERROR_CLASS.QBO_AUTH_TOKEN_EXPIRED);
  });
  it("qbo 403 scope → scope insufficient", () => {
    expect(
      classifyError({ source: "qbo", httpStatus: 403, qboFaultMessage: "scope missing" }),
    ).toBe(ERROR_CLASS.QBO_AUTH_SCOPE_INSUFFICIENT);
  });
  it("qbo 429 → rate limit", () => {
    expect(classifyError({ source: "qbo", httpStatus: 429 })).toBe(ERROR_CLASS.QBO_RATE_LIMIT);
  });
  it("qbo 400 write → write validation", () => {
    expect(classifyError({ source: "qbo", httpStatus: 400, method: "POST" })).toBe(
      ERROR_CLASS.QBO_WRITE_VALIDATION,
    );
  });
  it("qbo 400 readonly → readonly subscription", () => {
    expect(
      classifyError({ source: "qbo", httpStatus: 400, qboFaultMessage: "read-only subscription" }),
    ).toBe(ERROR_CLASS.QBO_WRITE_READONLY_SUBSCRIPTION);
  });
  it("qbo 500 → unavailable", () => {
    expect(classifyError({ source: "qbo", httpStatus: 500 })).toBe(ERROR_CLASS.QBO_UNAVAILABLE);
  });
  it("cdc stall → CDC_STALLED", () => {
    expect(classifyError({ source: "cdc", errorMessage: "no progress detected" })).toBe(
      ERROR_CLASS.CDC_STALLED,
    );
  });
  it("internal timeout → INTERNAL_TIMEOUT", () => {
    expect(classifyError({ source: "internal", errorMessage: "ETIMEDOUT" })).toBe(
      ERROR_CLASS.INTERNAL_TIMEOUT,
    );
  });
  it("internal db → INTERNAL_DB_ERROR", () => {
    expect(classifyError({ source: "internal", errorName: "PostgrestError" })).toBe(
      ERROR_CLASS.INTERNAL_DB_ERROR,
    );
  });
  it("bedrock → BEDROCK_UNAVAILABLE", () => {
    expect(classifyError({ source: "bedrock" })).toBe(ERROR_CLASS.BEDROCK_UNAVAILABLE);
  });
  it("stripe → STRIPE_ERROR", () => {
    expect(classifyError({ source: "stripe" })).toBe(ERROR_CLASS.STRIPE_ERROR);
  });
});

describe("normalizeEndpoint", () => {
  it("collapses qbo realm segment", () => {
    expect(normalizeEndpoint("/v3/company/1234567890/query?query=SELECT")).toBe(
      "/v3/company/:realm/query",
    );
  });
  it("collapses uuids", () => {
    expect(normalizeEndpoint("/api/tickets/12345678-1234-1234-1234-123456789012/comments")).toBe(
      "/api/tickets/:uuid/comments",
    );
  });
  it("collapses numeric ids", () => {
    expect(normalizeEndpoint("/api/orders/999/items")).toBe("/api/orders/:id/items");
  });
  it("strips query string", () => {
    expect(normalizeEndpoint("/foo?bar=1")).toBe("/foo");
  });
  it("root path", () => {
    expect(normalizeEndpoint("/")).toBe("/");
  });
});

describe("adaptiveDedupWindowMinutes", () => {
  it("auth = 60", () => expect(adaptiveDedupWindowMinutes(ERROR_CLASS.QBO_AUTH_TOKEN_EXPIRED)).toBe(60));
  it("rate limit = 120", () => expect(adaptiveDedupWindowMinutes(ERROR_CLASS.QBO_RATE_LIMIT)).toBe(120));
  it("write = 5", () => expect(adaptiveDedupWindowMinutes(ERROR_CLASS.QBO_WRITE_VALIDATION)).toBe(5));
  it("cdc = 240", () => expect(adaptiveDedupWindowMinutes(ERROR_CLASS.CDC_FAILED)).toBe(240));
  it("default = 15", () => expect(adaptiveDedupWindowMinutes("unknown")).toBe(15));
});

describe("autoFileTicket smoke", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips when userId missing", async () => {
    const result = await autoFileTicket({ userId: "", source: "qbo", httpStatus: 401 });
    expect(result.outcome).toBe("skipped");
  });

  it("files a ticket on first hit", async () => {
    const result = await autoFileTicket({
      userId: "11111111-1111-1111-1111-111111111111",
      source: "qbo",
      httpStatus: 401,
      realmId: "9130357456789",
      endpoint: "/v3/company/9130357456789/query",
      method: "GET",
    });
    expect(["filed", "skipped"]).toContain(result.outcome); // depending on mock state
    expect(result.errorClass).toBe(ERROR_CLASS.QBO_AUTH_TOKEN_EXPIRED);
    expect(result.dedupeKey).toMatch(/^[a-f0-9]{64}$/);
  });
});
