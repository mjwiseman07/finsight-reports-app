/**
 * Transport-level confidentiality: real @supabase/postgrest-js URL construction.
 * Fake sentinel credentials only — no network, no live Intuit/production data.
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  QBO_CREDENTIAL_CAS_URL_FILTER_COLUMNS,
  QboCredentialCasError,
  updateCanonicalQboCredentialsConditional,
} from "@/lib/integrations/accounting/canonical-qbo-credential-cas";

const ACCESS_SENTINEL = "SENTINEL_ACCESS_TOKEN_cas_transport_a1b2c3d4e5f6";
const REFRESH_SENTINEL = "SENTINEL_REFRESH_TOKEN_cas_transport_g7h8i9j0k1l2";
const CONCURRENCY = "2026-08-16T18:02:35.076Z";

type Captured = {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
};

function createCapturingClient(onCapture: (c: Captured) => void) {
  const fetchStub: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers: Record<string, string> = {};
    const rawHeaders = init?.headers;
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((v, k) => {
        headers[k] = v;
      });
    } else if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) headers[k] = v;
    } else if (rawHeaders && typeof rawHeaders === "object") {
      Object.assign(headers, rawHeaders);
    }
    const body =
      typeof init?.body === "string"
        ? init.body
        : init?.body
          ? JSON.stringify(init.body)
          : "";
    onCapture({
      url,
      method: String(init?.method || "GET").toUpperCase(),
      body,
      headers,
    });
    return new Response(
      JSON.stringify([{ id: "conn-1", updated_at: "2026-09-07T20:00:00.000Z" }]),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Range": "0-0/1",
        },
      },
    );
  };

  return createClient("http://127.0.0.1:54321", "test-anon-key-not-a-secret", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchStub },
  });
}

describe("QBO CAS PostgREST transport confidentiality", () => {
  it("keeps credential sentinels out of URL/searchParams; confines them to PATCH body", async () => {
    const captures: Captured[] = [];
    const client = createCapturingClient((c) => captures.push(c));

    await updateCanonicalQboCredentialsConditional(
      client,
      {
        connectionId: "conn-1",
        userId: "user-1",
        tenantOrRealmId: "realm-ca",
        concurrencyToken: CONCURRENCY,
        expectedStatus: "connected",
      },
      {
        accessToken: ACCESS_SENTINEL,
        refreshToken: REFRESH_SENTINEL,
        tokenExpiresAt: "2099-01-01T00:00:00.000Z",
        updatedAt: "2026-09-07T20:00:00.000Z",
      },
    );

    expect(captures.length).toBeGreaterThanOrEqual(1);
    const patch = captures.find((c) => c.method === "PATCH" || c.method === "POST");
    expect(patch).toBeTruthy();
    const captured = patch!;

    // Sanitized structure for review evidence (no secrets).
    const parsed = new URL(captured.url);
    const filterKeys = [...parsed.searchParams.keys()].sort();
    expect({
      origin: parsed.origin,
      pathname: parsed.pathname,
      method: captured.method,
      filterKeys,
      filterEntries: [...parsed.searchParams.entries()].map(([k, v]) => ({
        column: k,
        operatorValuePrefix: v.slice(0, Math.min(v.indexOf(".") === -1 ? 3 : v.indexOf(".") + 1, 8)),
      })),
    }).toEqual({
      origin: "http://127.0.0.1:54321",
      pathname: "/rest/v1/accounting_connections",
      method: captured.method,
      filterKeys,
      filterEntries: [...parsed.searchParams.entries()].map(([k, v]) => ({
        column: k,
        operatorValuePrefix: v.slice(0, Math.min(v.indexOf(".") === -1 ? 3 : v.indexOf(".") + 1, 8)),
      })),
    });

    const urlBlob = `${captured.url}\n${decodeURIComponent(captured.url)}`;
    expect(urlBlob).not.toContain(ACCESS_SENTINEL);
    expect(urlBlob).not.toContain(REFRESH_SENTINEL);
    expect(urlBlob).not.toContain(encodeURIComponent(ACCESS_SENTINEL));
    expect(urlBlob).not.toContain(encodeURIComponent(REFRESH_SENTINEL));

    for (const [key, value] of parsed.searchParams.entries()) {
      expect(value).not.toContain(ACCESS_SENTINEL);
      expect(value).not.toContain(REFRESH_SENTINEL);
      expect(key).not.toBe("access_token");
      expect(key).not.toBe("refresh_token");
      if (key === "select" || key === "limit" || key === "offset") continue;
      expect(QBO_CREDENTIAL_CAS_URL_FILTER_COLUMNS).toContain(
        key as (typeof QBO_CREDENTIAL_CAS_URL_FILTER_COLUMNS)[number],
      );
    }

    expect(parsed.searchParams.has("refresh_token")).toBe(false);
    expect(parsed.searchParams.has("access_token")).toBe(false);
    expect(parsed.searchParams.get("id")).toBe("eq.conn-1");
    expect(parsed.searchParams.get("provider")).toBe("eq.quickbooks");
    expect(parsed.searchParams.get("updated_at")).toBe(`eq.${CONCURRENCY}`);

    expect(captured.body).toContain(ACCESS_SENTINEL);
    expect(captured.body).toContain(REFRESH_SENTINEL);

    const headerBlob = JSON.stringify(captured.headers);
    expect(headerBlob).not.toContain(ACCESS_SENTINEL);
    expect(headerBlob).not.toContain(REFRESH_SENTINEL);
  });

  it("conflict path errors stay sanitized and do not embed sentinels", async () => {
    const captures: Captured[] = [];
    const emptyClient = createClient("http://127.0.0.1:54321", "test-anon-key-not-a-secret", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: async (input, init) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
          captures.push({
            url,
            method: String(init?.method || "GET").toUpperCase(),
            body: typeof init?.body === "string" ? init.body : "",
            headers: {},
          });
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json", "Content-Range": "*/0" },
          });
        },
      },
    });

    let caught: unknown;
    try {
      await updateCanonicalQboCredentialsConditional(
        emptyClient,
        {
          connectionId: "conn-1",
          userId: "user-1",
          tenantOrRealmId: "realm-ca",
          concurrencyToken: CONCURRENCY,
        },
        {
          accessToken: ACCESS_SENTINEL,
          refreshToken: REFRESH_SENTINEL,
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
          updatedAt: "2026-09-07T20:00:00.000Z",
        },
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(QboCredentialCasError);
    const text = `${(caught as Error).message} ${(caught as Error).stack || ""} ${JSON.stringify(caught)}`;
    expect(text).not.toContain(ACCESS_SENTINEL);
    expect(text).not.toContain(REFRESH_SENTINEL);
    for (const c of captures) {
      expect(c.url).not.toContain(ACCESS_SENTINEL);
      expect(c.url).not.toContain(REFRESH_SENTINEL);
    }
  });
});
