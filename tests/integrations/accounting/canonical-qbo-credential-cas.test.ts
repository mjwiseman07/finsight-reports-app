/**
 * Deterministic tests for canonical QBO credential CAS.
 * Fake credentials only — no live Intuit / production data.
 */
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  QboCredentialCasError,
  persistRefreshedQboCredentialsConditional,
  updateCanonicalQboCredentialsConditional,
} from "@/lib/integrations/accounting/canonical-qbo-credential-cas";

type FakeRow = {
  id: string;
  user_id: string;
  provider: string;
  tenant_or_realm_id: string;
  status: string;
  superseded_by_connection_id: string | null;
  credentials_cleared_at: string | null;
  updated_at: string;
  refresh_token: string;
  access_token: string;
  token_expires_at: string;
  provider_environment: string | null;
  metadata_json?: Record<string, unknown>;
};

type FakeAdmin = {
  from: (table: string) => unknown;
  _store: FakeRow[];
  _calls: Array<{ op: string; payload?: unknown; filters: Record<string, unknown> }>;
};

function asClient(admin: FakeAdmin): SupabaseClient {
  return admin as unknown as SupabaseClient;
}

function createFakeAdmin(rows: FakeRow[]): FakeAdmin {
  const store = rows.map((r) => ({ ...r }));
  const calls: FakeAdmin["_calls"] = [];

  function matches(row: FakeRow, filters: Record<string, unknown>) {
    for (const [k, v] of Object.entries(filters)) {
      if (k.endsWith("__is")) {
        const col = k.slice(0, -4) as keyof FakeRow;
        if (v === null && row[col] != null) return false;
        continue;
      }
      if (k.endsWith("__in")) {
        const col = k.slice(0, -4) as keyof FakeRow;
        if (!(v as unknown[]).includes(row[col])) return false;
        continue;
      }
      if (k.endsWith("__neq")) {
        const col = k.slice(0, -4) as keyof FakeRow;
        if (row[col] === v) return false;
        continue;
      }
      if (row[k as keyof FakeRow] !== v) return false;
    }
    return true;
  }

  function makeQuery(initialOp: "select" | "update" | "insert") {
    const filters: Record<string, unknown> = {};
    let payload: Record<string, unknown> | null = null;
    let op = initialOp;
    let limitN: number | null = null;

    const api = {
      select(_cols?: string) {
        void _cols;
        return api;
      },
      eq(col: string, val: unknown) {
        filters[col] = val;
        return api;
      },
      is(col: string, val: unknown) {
        filters[`${col}__is`] = val;
        return api;
      },
      in(col: string, val: unknown[]) {
        filters[`${col}__in`] = val;
        return api;
      },
      neq(col: string, val: unknown) {
        filters[`${col}__neq`] = val;
        return api;
      },
      order() {
        return api;
      },
      limit(n: number) {
        limitN = n;
        return api;
      },
      maybeSingle: async () => {
        const matched = store.filter((r) => matches(r, filters));
        return { data: matched[0] || null, error: null };
      },
      update(p: Record<string, unknown>) {
        op = "update";
        payload = p;
        return api;
      },
      insert(p: Record<string, unknown>) {
        op = "insert";
        payload = p;
        return api;
      },
      then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
        return Promise.resolve(api.execute()).then(resolve, reject);
      },
      execute: async () => {
        calls.push({ op, payload: payload || undefined, filters: { ...filters } });
        if (op === "update") {
          const matched = store.filter((r) => matches(r, filters));
          if (matched.length === 0) return { data: [], error: null };
          for (const row of matched) Object.assign(row, payload);
          const out = matched.map((r) => ({ id: r.id, updated_at: r.updated_at }));
          return { data: limitN ? out.slice(0, limitN) : out, error: null };
        }
        if (op === "insert" && payload) {
          const id = `ins-${store.length + 1}`;
          store.push({
            id,
            user_id: String(payload.user_id),
            provider: String(payload.provider),
            tenant_or_realm_id: String(payload.tenant_or_realm_id || ""),
            status: String(payload.status || "connected"),
            superseded_by_connection_id: null,
            credentials_cleared_at: null,
            updated_at: String(payload.updated_at),
            refresh_token: String(payload.refresh_token || ""),
            access_token: String(payload.access_token || ""),
            token_expires_at: String(payload.token_expires_at || ""),
            provider_environment: (payload.provider_environment as string) || null,
            metadata_json: (payload.metadata_json as Record<string, unknown>) || {},
          });
          return { data: [{ id }], error: null };
        }
        let matched = store.filter((r) => matches(r, filters));
        if (limitN) matched = matched.slice(0, limitN);
        return { data: matched, error: null };
      },
    };

    api.select = (_cols?: string) => {
      void _cols;
      if (op === "update" || op === "insert") {
        const thenable = {
          then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
            return api.execute().then(resolve, reject);
          },
          limit(n: number) {
            limitN = n;
            return thenable;
          },
        };
        return thenable;
      }
      op = "select";
      return api;
    };

    return api;
  }

  return {
    from(_table: string) {
      void _table;
      return {
        select: (cols?: string) => makeQuery("select").select(cols),
        update: (p: Record<string, unknown>) => makeQuery("update").update(p),
        insert: (p: Record<string, unknown>) => makeQuery("insert").insert(p),
      };
    },
    _store: store,
    _calls: calls,
  };
}

const baseRow = (): FakeRow => ({
  id: "conn-1",
  user_id: "user-1",
  provider: "quickbooks",
  tenant_or_realm_id: "realm-ca",
  status: "connected",
  superseded_by_connection_id: null,
  credentials_cleared_at: null,
  updated_at: "2026-08-16T18:02:35.076Z",
  refresh_token: "refresh-old",
  access_token: "access-old",
  token_expires_at: "2026-08-16T19:02:34.696Z",
  provider_environment: null,
  metadata_json: {},
});

describe("canonical QBO credential CAS", () => {
  it("refresh update succeeds with unchanged snapshot", async () => {
    const admin = createFakeAdmin([baseRow()]);
    const result = await persistRefreshedQboCredentialsConditional(
      asClient(admin),
      {
        connectionId: "conn-1",
        userId: "user-1",
        tenantOrRealmId: "realm-ca",
        concurrencyToken: "2026-08-16T18:02:35.076Z",
      },
      {
        accessToken: "access-new",
        refreshToken: "refresh-new",
        tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        updatedAt: "2026-09-07T20:00:00.000Z",
      },
    );
    expect(result.nextConcurrencyToken).toBe("2026-09-07T20:00:00.000Z");
    expect(admin._store[0].access_token).toBe("access-new");
    expect(admin._store[0].provider_environment).toBeNull();
  });

  it("stale updated_at returns typed conflict and does not overwrite", async () => {
    const admin = createFakeAdmin([baseRow()]);
    await expect(
      persistRefreshedQboCredentialsConditional(
        asClient(admin),
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T17:00:00.000Z",
        },
        {
          accessToken: "access-stale",
          refreshToken: "refresh-stale",
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        },
      ),
    ).rejects.toMatchObject({ code: "stale_connection_state", name: "QboCredentialCasError" });
    expect(admin._store[0].access_token).toBe("access-old");
  });

  it("CDC started before callback cannot overwrite callback afterward", async () => {
    const admin = createFakeAdmin([baseRow()]);
    await updateCanonicalQboCredentialsConditional(
      asClient(admin),
      {
        connectionId: "conn-1",
        userId: "user-1",
        tenantOrRealmId: "realm-ca",
        concurrencyToken: "2026-08-16T18:02:35.076Z",
      },
      {
        accessToken: "access-oauth",
        refreshToken: "refresh-oauth",
        tokenExpiresAt: "2099-01-01T01:00:00.000Z",
        updatedAt: "2026-09-07T21:00:00.000Z",
        providerEnvironment: "sandbox",
        status: "connected",
        clearSupersededBy: true,
      },
    );
    expect(admin._store[0].refresh_token).toBe("refresh-oauth");
    expect(admin._store[0].provider_environment).toBe("sandbox");

    await expect(
      persistRefreshedQboCredentialsConditional(
        asClient(admin),
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T18:02:35.076Z",
        },
        {
          accessToken: "access-cdc",
          refreshToken: "refresh-cdc",
          tokenExpiresAt: "2099-01-01T02:00:00.000Z",
        },
      ),
    ).rejects.toMatchObject({ code: "stale_connection_state" });
    expect(admin._store[0].access_token).toBe("access-oauth");
    expect(admin._store[0].refresh_token).toBe("refresh-oauth");
  });

  it("two concurrent refreshes converge with at most one successful persist", async () => {
    const admin = createFakeAdmin([baseRow()]);
    const snap = {
      connectionId: "conn-1",
      userId: "user-1",
      tenantOrRealmId: "realm-ca",
      concurrencyToken: "2026-08-16T18:02:35.076Z",
    };
    const results = await Promise.allSettled([
      persistRefreshedQboCredentialsConditional(asClient(admin), snap, {
        accessToken: "a1",
        refreshToken: "r1",
        tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        updatedAt: "2026-09-07T22:00:00.000Z",
      }),
      persistRefreshedQboCredentialsConditional(asClient(admin), snap, {
        accessToken: "a2",
        refreshToken: "r2",
        tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        updatedAt: "2026-09-07T22:00:01.000Z",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason).toBeInstanceOf(
      QboCredentialCasError,
    );
  });

  it("wrong-owner / wrong-realm / superseded / cleared fail closed", async () => {
    const admin = createFakeAdmin([baseRow()]);
    for (const snap of [
      { userId: "other", tenantOrRealmId: "realm-ca" },
      { userId: "user-1", tenantOrRealmId: "realm-other" },
    ]) {
      await expect(
        persistRefreshedQboCredentialsConditional(
          asClient(admin),
          {
            connectionId: "conn-1",
            concurrencyToken: "2026-08-16T18:02:35.076Z",
            ...snap,
          },
          {
            accessToken: "x",
            refreshToken: "y",
            tokenExpiresAt: "2099-01-01T00:00:00.000Z",
          },
        ),
      ).rejects.toMatchObject({ code: "stale_connection_state" });
    }

    admin._store[0].superseded_by_connection_id = "other";
    await expect(
      persistRefreshedQboCredentialsConditional(
        asClient(admin),
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T18:02:35.076Z",
        },
        {
          accessToken: "x",
          refreshToken: "y",
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        },
      ),
    ).rejects.toMatchObject({ code: "stale_connection_state" });

    admin._store[0].superseded_by_connection_id = null;
    admin._store[0].credentials_cleared_at = "2026-01-01T00:00:00.000Z";
    await expect(
      persistRefreshedQboCredentialsConditional(
        asClient(admin),
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T18:02:35.076Z",
        },
        {
          accessToken: "x",
          refreshToken: "y",
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        },
      ),
    ).rejects.toMatchObject({ code: "stale_connection_state" });
  });

  it("null environment is preserved by refresh; only explicit patch sets env", async () => {
    const admin = createFakeAdmin([baseRow()]);
    await persistRefreshedQboCredentialsConditional(
      asClient(admin),
      {
        connectionId: "conn-1",
        userId: "user-1",
        tenantOrRealmId: "realm-ca",
        concurrencyToken: "2026-08-16T18:02:35.076Z",
      },
      {
        accessToken: "a",
        refreshToken: "r",
        tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        updatedAt: "2026-09-07T23:00:00.000Z",
      },
    );
    expect(admin._store[0].provider_environment).toBeNull();
  });

  it("OAuth conflict errors never include credential material", async () => {
    const err = new QboCredentialCasError(
      "stale_connection_state",
      "Connection state changed before credentials could be persisted",
    );
    const text = `${err.message} ${err.stack || ""} ${JSON.stringify(err)}`;
    expect(text).not.toMatch(/access[_-]?token|refresh[_-]?token|eyJ|Bearer/i);
  });
});

describe("persistCanonicalAccountingConnectionGrant CAS", () => {
  it("callback update succeeds with unchanged snapshot", async () => {
    const admin = createFakeAdmin([baseRow()]);
    const result = await updateCanonicalQboCredentialsConditional(
      asClient(admin),
      {
        connectionId: "conn-1",
        userId: "user-1",
        tenantOrRealmId: "realm-ca",
        concurrencyToken: "2026-08-16T18:02:35.076Z",
        expectedStatus: "connected",
      },
      {
        accessToken: "oauth-access",
        refreshToken: "oauth-refresh",
        tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        updatedAt: "2026-09-07T21:30:00.000Z",
        providerEnvironment: "sandbox",
        status: "connected",
        clearSupersededBy: true,
      },
    );
    expect(result.nextConcurrencyToken).toBe("2026-09-07T21:30:00.000Z");
    expect(admin._store[0].provider_environment).toBe("sandbox");
  });

  it("stale conflict never becomes insert", async () => {
    const admin = createFakeAdmin([baseRow()]);
    await expect(
      updateCanonicalQboCredentialsConditional(
        asClient(admin),
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "stale-token",
        },
        {
          accessToken: "x",
          refreshToken: "y",
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
          updatedAt: "2026-09-07T21:30:00.000Z",
          providerEnvironment: "sandbox",
        },
      ),
    ).rejects.toMatchObject({ code: "stale_connection_state" });
    expect(admin._store.length).toBe(1);
    expect(admin._calls.some((c) => c.op === "insert")).toBe(false);
  });
});

describe("updated_at concurrency token string equality", () => {
  const TOKEN = "2026-08-16T18:02:35.076Z";

  it("exact updated_at token succeeds", async () => {
    const admin = createFakeAdmin([{ ...baseRow(), updated_at: TOKEN }]);
    await persistRefreshedQboCredentialsConditional(
      asClient(admin),
      {
        connectionId: "conn-1",
        userId: "user-1",
        tenantOrRealmId: "realm-ca",
        concurrencyToken: TOKEN,
      },
      {
        accessToken: "access-exact",
        refreshToken: "refresh-exact",
        tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        updatedAt: "2026-09-07T20:00:00.000Z",
      },
    );
    expect(admin._store[0].access_token).toBe("access-exact");
  });

  it("semantically similar timestamp strings fail closed without overwrite or retry", async () => {
    const variants = [
      "2026-08-16T18:02:35.076000+00:00",
      "2026-08-16T18:02:35.076+00:00",
      "2026-08-16T18:02:35.076000Z",
      "2026-08-16T18:02:35.077Z",
      "2026-08-16T18:02:35.076",
    ];
    for (const concurrencyToken of variants) {
      const admin = createFakeAdmin([{ ...baseRow(), updated_at: TOKEN }]);
      const beforeCalls = admin._calls.length;
      await expect(
        persistRefreshedQboCredentialsConditional(
          asClient(admin),
          {
            connectionId: "conn-1",
            userId: "user-1",
            tenantOrRealmId: "realm-ca",
            concurrencyToken,
          },
          {
            accessToken: "access-mismatch",
            refreshToken: "refresh-mismatch",
            tokenExpiresAt: "2099-01-01T00:00:00.000Z",
            updatedAt: "2026-09-07T20:00:00.000Z",
          },
        ),
      ).rejects.toMatchObject({
        code: "stale_connection_state",
        name: "QboCredentialCasError",
        message: "Connection state changed before credentials could be persisted",
      });
      expect(admin._store[0].access_token).toBe("access-old");
      expect(admin._store[0].updated_at).toBe(TOKEN);
      const updateCalls = admin._calls.filter((c) => c.op === "update");
      expect(updateCalls.length).toBe(1);
      expect(admin._calls.length).toBe(beforeCalls + 1);
      expect(JSON.stringify(updateCalls[0].filters)).not.toMatch(
        /access-mismatch|refresh-mismatch/,
      );
      expect(updateCalls[0].filters.updated_at).toBe(concurrencyToken);
    }
  });

  it("does not normalize or weaken the concurrency token on conflict", async () => {
    const admin = createFakeAdmin([{ ...baseRow(), updated_at: TOKEN }]);
    try {
      await persistRefreshedQboCredentialsConditional(
        asClient(admin),
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T18:02:35.076+00:00",
        },
        {
          accessToken: "access-retry",
          refreshToken: "refresh-retry",
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        },
      );
      throw new Error("expected conflict");
    } catch (err) {
      expect(err).toBeInstanceOf(QboCredentialCasError);
      expect((err as QboCredentialCasError).code).toBe("stale_connection_state");
      const text = `${(err as Error).message} ${JSON.stringify(err)}`;
      expect(text).not.toMatch(/access-retry|refresh-retry|18:02:35/);
      expect(admin._calls.filter((c) => c.op === "update").length).toBe(1);
    }
  });
});
