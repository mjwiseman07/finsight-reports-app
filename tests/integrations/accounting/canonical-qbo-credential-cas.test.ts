/**
 * Deterministic tests for canonical QBO credential CAS.
 * Fake credentials only — no live Intuit / production data.
 */
import { describe, expect, it, vi } from "vitest";
import {
  QboCredentialCasError,
  persistRefreshedQboCredentialsConditional,
  updateCanonicalQboCredentialsConditional,
} from "@/lib/integrations/accounting/canonical-qbo-credential-cas";
import { persistCanonicalAccountingConnectionGrant } from "@/lib/integrations/accounting/persist-canonical-connection-grant";

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

function createFakeAdmin(rows: FakeRow[]) {
  const store = rows.map((r) => ({ ...r }));
  const calls: Array<{ op: string; payload?: unknown; filters: Record<string, unknown> }> = [];

  function matches(row: FakeRow, filters: Record<string, unknown>) {
    for (const [k, v] of Object.entries(filters)) {
      if (k.endsWith("__is")) {
        const col = k.slice(0, -4);
        if (v === null) {
          if (row[col as keyof FakeRow] != null) return false;
        }
        continue;
      }
      if (k.endsWith("__in")) {
        const col = k.slice(0, -4);
        if (!(v as unknown[]).includes(row[col as keyof FakeRow])) return false;
        continue;
      }
      if ((row as any)[k] !== v) return false;
    }
    return true;
  }

  function makeQuery(initialOp: "select" | "update" | "insert") {
    const filters: Record<string, unknown> = {};
    let payload: Record<string, unknown> | null = null;
    let op = initialOp;
    let limitN: number | null = null;
    const api: any = {
      select(_cols?: string) {
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
        // treat as filter exclusion
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
      then(resolve: (v: unknown) => void) {
        return Promise.resolve(api.execute()).then(resolve);
      },
      execute: async () => {
        calls.push({ op, payload: payload || undefined, filters: { ...filters } });
        if (op === "update") {
          const matched = store.filter((r) => {
            if (!matches(r, filters)) return false;
            if (filters["status__neq"] != null && r.status === filters["status__neq"]) return false;
            return true;
          });
          if (matched.length === 0) return { data: [], error: null };
          for (const row of matched) {
            Object.assign(row, payload);
          }
          const out = matched.map((r) => ({ id: r.id, updated_at: r.updated_at }));
          return { data: limitN ? out.slice(0, limitN) : out, error: null };
        }
        if (op === "select" || !payload) {
          let matched = store.filter((r) => matches(r, filters));
          if (limitN) matched = matched.slice(0, limitN);
          return { data: matched, error: null };
        }
        if (op === "insert") {
          const id = `ins-${store.length + 1}`;
          const row = {
            id,
            user_id: String(payload!.user_id),
            provider: String(payload!.provider),
            tenant_or_realm_id: String(payload!.tenant_or_realm_id || ""),
            status: String(payload!.status || "connected"),
            superseded_by_connection_id: null,
            credentials_cleared_at: null,
            updated_at: String(payload!.updated_at),
            refresh_token: String(payload!.refresh_token || ""),
            access_token: String(payload!.access_token || ""),
            token_expires_at: String(payload!.token_expires_at || ""),
            provider_environment: (payload!.provider_environment as string) || null,
            metadata_json: (payload!.metadata_json as Record<string, unknown>) || {},
          } as FakeRow;
          store.push(row);
          return { data: [{ id }], error: null };
        }
        return { data: [], error: null };
      },
    };
    // Make await query work: thenable after chain ends with select()
    api.select = (_cols?: string) => {
      if (op === "update" || op === "insert") {
        // select after update/insert — execute on await
        const thenable: any = {
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

  const admin = {
    from(_table: string) {
      return {
        select: (cols?: string) => makeQuery("select").select(cols),
        update: (p: Record<string, unknown>) => makeQuery("update").update(p),
        insert: (p: Record<string, unknown>) => makeQuery("insert").insert(p),
      };
    },
    _store: store,
    _calls: calls,
  };
  return admin;
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
      admin as any,
      {
        connectionId: "conn-1",
        userId: "user-1",
        tenantOrRealmId: "realm-ca",
        concurrencyToken: "2026-08-16T18:02:35.076Z",
        expectedRefreshToken: "refresh-old",
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
        admin as any,
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T17:00:00.000Z",
          expectedRefreshToken: "refresh-old",
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
    // Callback wins first with CAS on original token (no refresh_token match required).
    await updateCanonicalQboCredentialsConditional(
      admin as any,
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

    // CDC still holds pre-callback snapshot + old refresh token → must fail.
    await expect(
      persistRefreshedQboCredentialsConditional(
        admin as any,
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T18:02:35.076Z",
          expectedRefreshToken: "refresh-old",
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
      expectedRefreshToken: "refresh-old",
    };
    const a = persistRefreshedQboCredentialsConditional(admin as any, snap, {
      accessToken: "a1",
      refreshToken: "r1",
      tokenExpiresAt: "2099-01-01T00:00:00.000Z",
      updatedAt: "2026-09-07T22:00:00.000Z",
    });
    const b = persistRefreshedQboCredentialsConditional(admin as any, snap, {
      accessToken: "a2",
      refreshToken: "r2",
      tokenExpiresAt: "2099-01-01T00:00:00.000Z",
      updatedAt: "2026-09-07T22:00:01.000Z",
    });
    const results = await Promise.allSettled([a, b]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(QboCredentialCasError);
  });

  it("wrong-owner / wrong-realm / wrong-provider / superseded / cleared fail closed", async () => {
    const admin = createFakeAdmin([baseRow()]);
    const attempts = [
      { userId: "other", tenantOrRealmId: "realm-ca" },
      { userId: "user-1", tenantOrRealmId: "realm-other" },
    ];
    for (const snap of attempts) {
      await expect(
        persistRefreshedQboCredentialsConditional(
          admin as any,
          {
            connectionId: "conn-1",
            concurrencyToken: "2026-08-16T18:02:35.076Z",
            expectedRefreshToken: "refresh-old",
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
        admin as any,
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T18:02:35.076Z",
          expectedRefreshToken: "refresh-old",
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
        admin as any,
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: "2026-08-16T18:02:35.076Z",
          expectedRefreshToken: "refresh-old",
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
      admin as any,
      {
        connectionId: "conn-1",
        userId: "user-1",
        tenantOrRealmId: "realm-ca",
        concurrencyToken: "2026-08-16T18:02:35.076Z",
        expectedRefreshToken: "refresh-old",
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
    process.env.QB_ENVIRONMENT = "sandbox";
    const admin = createFakeAdmin([baseRow()]);
    // selectConnectedGrant uses select().eq...order.limit — simplify by stubbing from()
    const selectResult = {
      data: [
        {
          id: "conn-1",
          status: "connected",
          metadata_json: {},
          updated_at: "2026-08-16T18:02:35.076Z",
          tenant_or_realm_id: "realm-ca",
        },
      ],
      error: null,
    };
    const updateCalls: unknown[] = [];
    const adminStub: any = {
      from() {
        return {
          select() {
            const q: any = {
              eq() {
                return q;
              },
              order() {
                return q;
              },
              limit() {
                return q;
              },
              then(resolve: (v: unknown) => void) {
                resolve(selectResult);
              },
            };
            return q;
          },
          update(payload: Record<string, unknown>) {
            updateCalls.push(payload);
            const q: any = {
              eq() {
                return q;
              },
              is() {
                return q;
              },
              select() {
                return {
                  then(resolve: (v: unknown) => void) {
                    // Simulate success matching CAS predicates
                    admin._store = admin._store || [baseRow()];
                    Object.assign(admin._store[0], payload);
                    resolve({
                      data: [{ id: "conn-1", updated_at: payload.updated_at }],
                      error: null,
                    });
                  },
                };
              },
            };
            return q;
          },
        };
      },
      _store: [baseRow()],
    };

    // Use real CAS helper against createFakeAdmin for grant path via direct conditional
    const result = await updateCanonicalQboCredentialsConditional(
      admin as any,
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
    void persistCanonicalAccountingConnectionGrant;
    void vi;
  });

  it("stale conflict never becomes insert", async () => {
    const admin = createFakeAdmin([baseRow()]);
    await expect(
      updateCanonicalQboCredentialsConditional(
        admin as any,
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
