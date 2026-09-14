import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";

const state = vi.hoisted(() => ({
  leads: [] as Array<Record<string, unknown>>,
  sessions: [] as Array<Record<string, unknown>>,
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase", () => {
  function from(table: string) {
    if (table === "free_review_leads") {
      return {
        select: () => ({
          eq: (_c: string, id: string) => ({
            maybeSingle: async () => {
              const row = state.leads.find((l) => l.id === id) || null;
              return { data: row, error: null };
            },
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: "unused" } }),
          }),
        }),
      };
    }
    if (table === "free_review_lead_sessions") {
      return {
        select: () => ({
          eq: (_c: string, hash: string) => ({
            maybeSingle: async () => {
              const row = state.sessions.find((s) => s.token_hash === hash) || null;
              return { data: row, error: null };
            },
          }),
        }),
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              const row = {
                id: randomUUID(),
                ...payload,
                revoked_at: null,
              };
              state.sessions.push(row);
              return { data: { id: row.id }, error: null };
            },
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: (col: string, val: string) => {
            const apply = (predicate: (s: Record<string, unknown>) => boolean) => {
              for (const s of state.sessions) {
                if (predicate(s)) Object.assign(s, patch);
              }
              return {
                is: () => ({
                  neq: () => Promise.resolve({ error: null }),
                }),
                neq: () => Promise.resolve({ error: null }),
              };
            };
            if (col === "id") {
              return {
                is: (_c: string, _v: null) => {
                  apply((s) => s.id === val && s.revoked_at == null);
                  return Promise.resolve({ error: null });
                },
              };
            }
            if (col === "lead_id") {
              return {
                is: (_c: string, _v: null) => ({
                  neq: (_c2: string, sid: string) => {
                    apply((s) => s.lead_id === val && s.id !== sid && s.revoked_at == null);
                    return Promise.resolve({ error: null });
                  },
                }),
              };
            }
            if (col === "token_hash" || col === "id") {
              apply((s) => s[col] === val);
            }
            return {
              is: () => Promise.resolve({ error: null }),
              neq: () => Promise.resolve({ error: null }),
            };
          },
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  }

  return {
    supabaseAdmin: {
      auth: { getUser: (...a: unknown[]) => state.getUser(...a) },
      from,
    },
  };
});

import {
  generateLeadSessionToken,
  hashLeadSessionToken,
  issueLeadSession,
  looksLikeLegacyLeadIdCookie,
  resolveLeadSessionFromToken,
  LEAD_SESSION_COOKIE,
} from "@/lib/free-review/lead-session";
import {
  isAccountingPrincipalDenial,
  resolveAccountingRequestPrincipal,
} from "@/lib/integrations/accounting/resolve-request-principal";

beforeEach(() => {
  state.leads = [];
  state.sessions = [];
  state.getUser.mockReset();
});

function seedLead(id: string, status = "lead_captured") {
  state.leads.push({ id, status, email: "a@b.c", business_name: "Acme" });
}

describe("opaque lead session crypto contract", () => {
  it("hashes tokens with SHA-256 hex and rejects UUID-shaped legacy cookies", () => {
    const token = generateLeadSessionToken();
    expect(token).not.toMatch(/^[0-9a-f-]{36}$/i);
    expect(hashLeadSessionToken(token)).toHaveLength(64);
    expect(hashLeadSessionToken(token)).toBe(
      createHash("sha256").update(token, "utf8").digest("hex"),
    );
    expect(looksLikeLegacyLeadIdCookie("11111111-1111-4111-8111-111111111111")).toBe(true);
  });
});

describe("lead session lifecycle", () => {
  it("issues session and resolves active lead", async () => {
    seedLead("11111111-1111-4111-8111-111111111111");
    const issued = await issueLeadSession({ leadId: "11111111-1111-4111-8111-111111111111" });
    const resolved = await resolveLeadSessionFromToken(issued.token);
    expect(resolved?.leadId).toBe("11111111-1111-4111-8111-111111111111");
    expect(state.sessions[0].token_hash).toBe(hashLeadSessionToken(issued.token));
    expect(issued.token).not.toEqual(state.sessions[0].token_hash);
  });

  it("rejects forged random token", async () => {
    seedLead("11111111-1111-4111-8111-111111111111");
    await issueLeadSession({ leadId: "11111111-1111-4111-8111-111111111111" });
    expect(await resolveLeadSessionFromToken(generateLeadSessionToken())).toBeNull();
  });

  it("rejects raw lead UUID used as cookie token", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    expect(await resolveLeadSessionFromToken(leadId)).toBeNull();
  });

  it("rejects expired session", async () => {
    seedLead("11111111-1111-4111-8111-111111111111");
    const issued = await issueLeadSession({ leadId: "11111111-1111-4111-8111-111111111111" });
    state.sessions[0].expires_at = new Date(Date.now() - 1000).toISOString();
    expect(await resolveLeadSessionFromToken(issued.token)).toBeNull();
  });

  it("rejects revoked session", async () => {
    seedLead("11111111-1111-4111-8111-111111111111");
    const issued = await issueLeadSession({ leadId: "11111111-1111-4111-8111-111111111111" });
    state.sessions[0].revoked_at = new Date().toISOString();
    expect(await resolveLeadSessionFromToken(issued.token)).toBeNull();
  });

  it("rejects inactive/revoked lead status", async () => {
    seedLead("11111111-1111-4111-8111-111111111111", "revoked");
    const issued = await issueLeadSession({ leadId: "11111111-1111-4111-8111-111111111111" });
    expect(await resolveLeadSessionFromToken(issued.token)).toBeNull();
  });

  it("rejects rotated/replaced prior token", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const first = await issueLeadSession({ leadId });
    const second = await issueLeadSession({ leadId, replaceSessionId: first.sessionId });
    state.sessions.find((s) => s.id === first.sessionId)!.revoked_at = new Date().toISOString();
    expect(await resolveLeadSessionFromToken(first.token)).toBeNull();
    const stillActive = await resolveLeadSessionFromToken(second.token);
    expect(stillActive?.leadId).toBe(leadId);
  });
});

describe("resolveAccountingRequestPrincipal with opaque sessions", () => {
  function req(init: { auth?: string; cookie?: string; body?: Record<string, unknown> }) {
    const headers = new Headers();
    if (init.auth) headers.set("authorization", init.auth);
    if (init.cookie) headers.set("cookie", init.cookie);
    return {
      request: new Request("http://localhost/api/accounting/active-context", {
        method: "POST",
        headers,
      }),
      body: init.body,
    };
  }

  it("allows legitimate Free Review session cookie", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const issued = await issueLeadSession({ leadId });
    const result = await resolveAccountingRequestPrincipal(
      req({ cookie: `${LEAD_SESSION_COOKIE}=${issued.token}` }),
    );
    expect(isAccountingPrincipalDenial(result)).toBe(false);
    if (!isAccountingPrincipalDenial(result)) {
      expect(result).toMatchObject({ kind: "lead", leadId, userId: leadId });
    }
  });

  it("rejects legacy free_review_lead_id cookie retirement path", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const result = await resolveAccountingRequestPrincipal(
      req({ cookie: `free_review_lead_id=${leadId}` }),
    );
    expect(result).toEqual({ status: 401, body: { error: "Unauthorized" } });
  });

  it("valid bearer wins over co-present session cookie (explicit precedence)", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const issued = await issueLeadSession({ leadId });
    state.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const result = await resolveAccountingRequestPrincipal(
      req({
        auth: "Bearer good",
        cookie: `${LEAD_SESSION_COOKIE}=${issued.token}`,
      }),
    );
    expect(result).toEqual({ kind: "user", userId: "user-1" });
  });

  it("invalid bearer fails closed and does not use cookie", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const issued = await issueLeadSession({ leadId });
    state.getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
    const result = await resolveAccountingRequestPrincipal(
      req({
        auth: "Bearer bad",
        cookie: `${LEAD_SESSION_COOKIE}=${issued.token}`,
      }),
    );
    expect(result).toEqual({ status: 401, body: { error: "Invalid or expired token" } });
  });

  it("rejects body leadId claim that conflicts with session lead", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const issued = await issueLeadSession({ leadId });
    const result = await resolveAccountingRequestPrincipal(
      req({
        cookie: `${LEAD_SESSION_COOKIE}=${issued.token}`,
        body: { leadId: "22222222-2222-4222-8222-222222222222" },
      }),
    );
    expect(result).toEqual({ status: 401, body: { error: "Unauthorized" } });
  });
});
