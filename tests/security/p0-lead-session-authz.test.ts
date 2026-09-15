import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const state = vi.hoisted(() => ({
  leads: [] as Array<Record<string, unknown>>,
  sessions: [] as Array<Record<string, unknown>>,
  getUser: vi.fn(),
  rpcFail: null as null | "revoke" | "insert" | "cleanup" | "unique",
  rpc: vi.fn(),
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
        update: (patch: Record<string, unknown>) => ({
          eq: (col: string, val: string) => ({
            is: () => {
              for (const s of state.sessions) {
                if (s[col] === val && s.revoked_at == null) Object.assign(s, patch);
              }
              return Promise.resolve({ error: null });
            },
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  }

  async function rpc(name: string, args: Record<string, unknown>) {
    state.rpc(name, args);
    if (name === "rotate_free_review_lead_session") {
      if (state.rpcFail === "revoke") {
        return { data: null, error: { message: "forced_revoke_failure" } };
      }
      if (state.rpcFail === "unique") {
        return {
          data: null,
          error: { message: "duplicate key value violates unique constraint", code: "23505" },
        };
      }
      const leadId = String(args.p_lead_id);
      const tokenHash = String(args.p_token_hash);
      const expiresAt = String(args.p_expires_at);
      const lead = state.leads.find((l) => l.id === leadId);
      if (!lead) return { data: null, error: { message: "lead_not_found" } };
      const status = String(lead.status || "").trim().toLowerCase();
      const allowed = new Set([
        "lead_captured",
        "onboarding_started",
        "quickbooks_connected",
        "xero_connected",
      ]);
      if (!allowed.has(status)) {
        return { data: null, error: { message: "lead_status_not_active" } };
      }
      if (state.rpcFail === "insert") {
        // Transaction would roll back revoke+insert; leave state unchanged.
        return { data: null, error: { message: "forced_insert_failure" } };
      }
      const nowIso = new Date().toISOString();
      for (const s of state.sessions) {
        if (s.lead_id === leadId && s.revoked_at == null) {
          s.revoked_at = nowIso;
        }
      }
      const id = randomUUID();
      for (const s of state.sessions) {
        if (s.lead_id === leadId && s.revoked_at === nowIso && !s.replaced_by_session_id) {
          s.replaced_by_session_id = id;
        }
      }
      state.sessions.push({
        id,
        lead_id: leadId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        revoked_at: null,
        created_at: nowIso,
      });
      return { data: id, error: null };
    }
    if (name === "cleanup_free_review_lead_sessions") {
      if (state.rpcFail === "cleanup") {
        return { data: null, error: { message: "forced_cleanup_failure" } };
      }
      const retentionDays = Number(args.p_retention_days || 30);
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      let deleted = 0;
      state.sessions = state.sessions.filter((s) => {
        const revokedAt = s.revoked_at ? Date.parse(String(s.revoked_at)) : null;
        const expiresAt = Date.parse(String(s.expires_at));
        const active = revokedAt == null && expiresAt > now;
        if (active) return true;
        const deadAt = revokedAt ?? expiresAt;
        if (deadAt < cutoff) {
          deleted += 1;
          return false;
        }
        return true;
      });
      return { data: deleted, error: null };
    }
    return { data: null, error: { message: `unexpected_rpc:${name}` } };
  }

  return {
    supabaseAdmin: {
      auth: { getUser: (...a: unknown[]) => state.getUser(...a) },
      from,
      rpc,
    },
  };
});

import {
  ACTIVE_LEAD_STATUSES,
  cleanupExpiredLeadSessions,
  generateLeadSessionToken,
  hashLeadSessionToken,
  isActiveLeadStatus,
  issueLeadSession,
  looksLikeLegacyLeadIdCookie,
  planLeadEnrichUpdate,
  resolveLeadSessionFromToken,
  serverControlledStatusAfterEnrich,
  LEAD_SESSION_COOKIE,
  LEAD_SESSION_RETENTION_DAYS,
} from "@/lib/free-review/lead-session";
import {
  isAccountingPrincipalDenial,
  resolveAccountingRequestPrincipal,
} from "@/lib/integrations/accounting/resolve-request-principal";

beforeEach(() => {
  state.leads = [];
  state.sessions = [];
  state.getUser.mockReset();
  state.rpc.mockReset();
  state.rpcFail = null;
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

describe("explicit lead status allowlist", () => {
  it.each([...ACTIVE_LEAD_STATUSES])("allows known active status %s", (status) => {
    expect(isActiveLeadStatus(status)).toBe(true);
  });

  it.each([
    "",
    null,
    undefined,
    "converted",
    "suspended",
    "blocked",
    "deleted",
    "rejected",
    "expired",
    "revoked",
    "cancelled",
    "canceled",
    "closed",
    "inactive",
    "future_unknown_status",
  ])("fails closed for disallowed status %s", (status) => {
    expect(isActiveLeadStatus(status as string | null | undefined)).toBe(false);
  });

  it("case-folds allowlisted statuses", () => {
    expect(isActiveLeadStatus("Lead_Captured")).toBe(true);
    expect(isActiveLeadStatus("QUICKBOOKS_CONNECTED")).toBe(true);
  });

  it("serverControlledStatusAfterEnrich never accepts client status strings", () => {
    expect(serverControlledStatusAfterEnrich("lead_captured")).toBe("onboarding_started");
    expect(serverControlledStatusAfterEnrich("onboarding_started")).toBe("onboarding_started");
    expect(serverControlledStatusAfterEnrich("quickbooks_connected")).toBe("quickbooks_connected");
    expect(serverControlledStatusAfterEnrich("xero_connected")).toBe("xero_connected");
    expect(serverControlledStatusAfterEnrich("suspended")).toBeNull();
    expect(serverControlledStatusAfterEnrich("")).toBeNull();
  });

  it("planLeadEnrichUpdate advances lead_captured only under exact predicate", () => {
    expect(planLeadEnrichUpdate("lead_captured")).toEqual({
      ok: true,
      statusPredicate: "lead_captured",
      statusWrite: "onboarding_started",
    });
  });

  it("planLeadEnrichUpdate does not regress or overwrite other allowlisted statuses", () => {
    expect(planLeadEnrichUpdate("onboarding_started")).toEqual({
      ok: true,
      statusPredicate: "onboarding_started",
      statusWrite: null,
    });
    expect(planLeadEnrichUpdate("quickbooks_connected")).toEqual({
      ok: true,
      statusPredicate: "quickbooks_connected",
      statusWrite: null,
    });
    expect(planLeadEnrichUpdate("xero_connected")).toEqual({
      ok: true,
      statusPredicate: "xero_connected",
      statusWrite: null,
    });
  });

  it("planLeadEnrichUpdate fails closed for inactive/unknown statuses", () => {
    expect(planLeadEnrichUpdate("revoked")).toEqual({ ok: false });
    expect(planLeadEnrichUpdate("converted")).toEqual({ ok: false });
    expect(planLeadEnrichUpdate("")).toEqual({ ok: false });
    expect(planLeadEnrichUpdate(null)).toEqual({ ok: false });
  });

  it("PATCH route uses exact status predicate and planLeadEnrichUpdate (no resolve-only write)", () => {
    const source = readFileSync(join(process.cwd(), "app/api/free-review/leads/route.js"), "utf8");
    expect(source).toContain("status_not_writable");
    expect(source).toContain("planLeadEnrichUpdate");
    expect(source).toContain('.eq("status", enrichPlan.statusPredicate)');
    expect(source).toContain("if (!data?.id)");
    expect(source).not.toMatch(/status:\s*normalizeText\(body\.status/);
    expect(source).not.toContain("serverControlledStatusAfterEnrich");
  });
});

describe("PATCH enrich TOCTOU status predicate", () => {
  /**
   * Deterministic simulation of the route's conditional update:
   * UPDATE ... WHERE id = ? AND status = predicate.
   */
  function applyEnrichUpdate(args: {
    leadId: string;
    resolvedStatusAtAuth: string;
    enrichment: Record<string, unknown>;
  }): { affected: number; lead: Record<string, unknown> | null } {
    const plan = planLeadEnrichUpdate(args.resolvedStatusAtAuth);
    if (!plan.ok) return { affected: 0, lead: null };
    const lead = state.leads.find((l) => l.id === args.leadId);
    if (!lead) return { affected: 0, lead: null };
    if (String(lead.status) !== plan.statusPredicate) return { affected: 0, lead: null };
    Object.assign(lead, args.enrichment);
    if (plan.statusWrite) lead.status = plan.statusWrite;
    return { affected: 1, lead };
  }

  it("fails closed with zero enrichment writes after concurrent deactivation", () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId, "lead_captured");
    const resolvedStatusAtAuth = "lead_captured";
    // Concurrent deactivation after session resolve, before update:
    state.leads[0].status = "revoked";
    const result = applyEnrichUpdate({
      leadId,
      resolvedStatusAtAuth,
      enrichment: { industry: "should_not_write" },
    });
    expect(result.affected).toBe(0);
    expect(state.leads[0].status).toBe("revoked");
    expect(state.leads[0].industry).toBeUndefined();
  });

  it("advances lead_captured → onboarding_started only when row still lead_captured", () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId, "lead_captured");
    const result = applyEnrichUpdate({
      leadId,
      resolvedStatusAtAuth: "lead_captured",
      enrichment: { industry: "Manufacturing" },
    });
    expect(result.affected).toBe(1);
    expect(state.leads[0].status).toBe("onboarding_started");
    expect(state.leads[0].industry).toBe("Manufacturing");
  });

  it("does not regress quickbooks_connected when enriching under matching predicate", () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId, "quickbooks_connected");
    const result = applyEnrichUpdate({
      leadId,
      resolvedStatusAtAuth: "quickbooks_connected",
      enrichment: { industry: "Retail" },
    });
    expect(result.affected).toBe(1);
    expect(state.leads[0].status).toBe("quickbooks_connected");
    expect(state.leads[0].industry).toBe("Retail");
  });

  it("fails closed when allowed status advanced between resolve and update", () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId, "lead_captured");
    const resolvedStatusAtAuth = "lead_captured";
    // Concurrent OAuth callback advanced status before enrich UPDATE:
    state.leads[0].status = "quickbooks_connected";
    const result = applyEnrichUpdate({
      leadId,
      resolvedStatusAtAuth,
      enrichment: { industry: "should_not_write" },
    });
    expect(result.affected).toBe(0);
    expect(state.leads[0].status).toBe("quickbooks_connected");
    expect(state.leads[0].industry).toBeUndefined();
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
    expect(state.rpc).toHaveBeenCalledWith(
      "rotate_free_review_lead_session",
      expect.objectContaining({
        p_lead_id: "11111111-1111-4111-8111-111111111111",
        p_token_hash: hashLeadSessionToken(issued.token),
      }),
    );
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

  it.each(["revoked", "expired", "suspended", "converted", "future_x"])(
    "rejects issue/resolve when lead status is %s",
    async (status) => {
      const leadId = "11111111-1111-4111-8111-111111111111";
      seedLead(leadId, status);
      await expect(issueLeadSession({ leadId })).rejects.toThrow(/lead_status_not_active|lead_session_issue_failed/);
      // Pre-seed a stale hashed row to prove resolve also fails closed on status.
      const token = generateLeadSessionToken();
      state.sessions.push({
        id: randomUUID(),
        lead_id: leadId,
        token_hash: hashLeadSessionToken(token),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        revoked_at: null,
      });
      expect(await resolveLeadSessionFromToken(token)).toBeNull();
    },
  );

  it.each([...ACTIVE_LEAD_STATUSES])("resolves session for allowlisted status %s", async (status) => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId, status);
    const issued = await issueLeadSession({ leadId });
    expect(await resolveLeadSessionFromToken(issued.token)).toMatchObject({ leadId, leadStatus: status });
  });

  it("rejects rotated/replaced prior token without manual revoke patching", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const first = await issueLeadSession({ leadId });
    const second = await issueLeadSession({ leadId });
    expect(await resolveLeadSessionFromToken(first.token)).toBeNull();
    expect(await resolveLeadSessionFromToken(second.token)).toMatchObject({ leadId });
    const active = state.sessions.filter((s) => s.lead_id === leadId && s.revoked_at == null);
    expect(active).toHaveLength(1);
  });

  it("propagates forced revoke/update failure without issuing a usable cookie path", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    state.rpcFail = "revoke";
    await expect(issueLeadSession({ leadId })).rejects.toThrow("lead_session_issue_failed");
    expect(state.sessions.filter((s) => s.revoked_at == null)).toHaveLength(0);
  });

  it("propagates forced insert failure and relies on transaction rollback (prior session unchanged in unit mock)", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const first = await issueLeadSession({ leadId });
    expect(await resolveLeadSessionFromToken(first.token)).not.toBeNull();
    state.rpcFail = "insert";
    // Unit mock rolls back mutations on insert failure; disposable Postgres rehearsal
    // proves revoke+insert atomicity under a failing AFTER-REVOKE insert trigger.
    await expect(issueLeadSession({ leadId })).rejects.toThrow("lead_session_issue_failed");
    expect(state.sessions.filter((s) => s.revoked_at == null)).toHaveLength(1);
    expect(await resolveLeadSessionFromToken(first.token)).not.toBeNull();
  });

  it("maps uniqueness conflicts to sanitized lead_session_conflict", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    state.rpcFail = "unique";
    await expect(issueLeadSession({ leadId })).rejects.toThrow("lead_session_conflict");
  });
});

describe("bounded retention cleanup", () => {
  it("deletes expired/revoked rows outside retention window only", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const oldRevoked = {
      id: randomUUID(),
      lead_id: leadId,
      token_hash: "a".repeat(64),
      expires_at: new Date(Date.now() - 40 * 86400_000).toISOString(),
      revoked_at: new Date(Date.now() - 40 * 86400_000).toISOString(),
    };
    const recentRevoked = {
      id: randomUUID(),
      lead_id: leadId,
      token_hash: "b".repeat(64),
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
      revoked_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
    };
    const active = {
      id: randomUUID(),
      lead_id: leadId,
      token_hash: "c".repeat(64),
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
      revoked_at: null,
    };
    state.sessions.push(oldRevoked, recentRevoked, active);
    const deleted = await cleanupExpiredLeadSessions(LEAD_SESSION_RETENTION_DAYS);
    expect(deleted).toBe(1);
    expect(state.sessions.map((s) => s.id).sort()).toEqual([recentRevoked.id, active.id].sort());
  });

  it("never deletes active sessions", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111";
    seedLead(leadId);
    const issued = await issueLeadSession({ leadId });
    const deleted = await cleanupExpiredLeadSessions(1);
    expect(deleted).toBe(0);
    expect(await resolveLeadSessionFromToken(issued.token)).not.toBeNull();
  });

  it("reports cleanup failure instead of swallowing", async () => {
    state.rpcFail = "cleanup";
    await expect(cleanupExpiredLeadSessions(30)).rejects.toThrow("lead_session_cleanup_failed");
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
