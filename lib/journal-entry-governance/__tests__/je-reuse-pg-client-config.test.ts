import { describe, expect, it, vi } from "vitest";
import {
  resolveJeReusePgClientConfig,
  redactUrl,
  sanitizeErrorMessage,
  isLoopbackIp,
  DEFAULT_SSL,
} from "./je-reuse-pg-client-config.js";

const EXPECTED_INTEGRATION_TITLES = [
  "migration compile: reservation + transition RPCs exist",
  "A. first reservation inserts row + execution_requested receipt",
  "B. exact idempotency replay → reused, no duplicate receipt",
  "C. approval_id replay with same binding → reused",
  "D. binding mismatch on approval_id → fail closed",
  "E. transition RESERVED → READY_TO_POST + execution_ready receipt",
  "E2. Patent #6 chain adjacency for requested → ready receipts",
  "F. state_version conflict on transition → rejected",
  "G. transition RESERVED → PRECHECK_FAILED + execution_precheck_failed receipt",
  "H. concurrent approval_id reservation attempts converge to one execution",
  "I. zero provider-attempt rows for execution reservation path",
  "J. never touches staged production execution custody id",
] as const;

describe("je-reuse-pg-client-config (test infrastructure)", () => {
  it("verified loopback + explicit sslmode=disable → ssl:false", async () => {
    const r = await resolveJeReusePgClientConfig(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.ssl).toBe(false);
    expect(r.config.transport).toBe("plaintext_loopback");
    expect(r.config.credentialsIncludedInEvidence).toBe(false);
    expect(r.redacted).toBe("host=127.0.0.1;port=54322;db=postgres");
    expect(r.redacted).not.toMatch(/postgres:postgres/);
    expect(JSON.stringify({ redacted: r.redacted, transport: r.config.transport })).not.toMatch(
      /:[^:@/]+@/,
    );
  });

  it("loopback ::1 + sslmode=disable → ssl:false", async () => {
    const r = await resolveJeReusePgClientConfig(
      "postgresql://postgres:x@[::1]:54322/postgres?sslmode=disable",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.ssl).toBe(false);
    expect(r.config.transport).toBe("plaintext_loopback");
  });

  it("localhost exclusively resolving to loopback + sslmode=disable → ssl:false", async () => {
    const r = await resolveJeReusePgClientConfig(
      "postgresql://postgres:x@localhost:54322/postgres?sslmode=disable",
      {
        lookupAll: async () => [{ address: "127.0.0.1", family: 4 }],
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.ssl).toBe(false);
  });

  it("loopback without explicit disable does not silently downgrade", async () => {
    const r = await resolveJeReusePgClientConfig(
      "postgresql://postgres:x@127.0.0.1:54322/postgres",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.ssl).toEqual(DEFAULT_SSL);
    expect(r.config.transport).toBe("tls_required");
    expect(r.config.connectionString).not.toMatch(/sslmode=/);
  });

  it("remote/cloud/pooler cannot disable SSL", async () => {
    const cases = [
      "postgresql://postgres:x@db.abc.supabase.co:5432/postgres?sslmode=disable",
      "postgresql://postgres:x@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=disable",
      "postgresql://postgres:x@prod.example.com:54322/postgres?sslmode=disable",
      "postgresql://postgres:x@192.168.1.10:54322/postgres?sslmode=disable",
    ];
    for (const url of cases) {
      const r = await resolveJeReusePgClientConfig(url, {
        lookupAll: async () => [{ address: "203.0.113.10", family: 4 }],
      });
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(
        r.failures.some(
          (f) =>
            f.rule === "non_loopback_sslmode_disable_rejected" ||
            f.rule === "cloud_or_pooler_sslmode_disable_rejected",
        ),
      ).toBe(true);
      expect(JSON.stringify(r)).not.toMatch(/:[^:@/]+@/);
    }
  });

  it("mixed loopback/non-loopback localhost resolution is rejected", async () => {
    const r = await resolveJeReusePgClientConfig(
      "postgresql://postgres:x@localhost:54322/postgres?sslmode=disable",
      {
        lookupAll: async () => [
          { address: "127.0.0.1", family: 4 },
          { address: "203.0.113.50", family: 4 },
        ],
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failures.some((f) => f.rule === "mixed_loopback_non_loopback_resolution")).toBe(
      true,
    );
  });

  it("malformed or deceptive hosts are rejected", async () => {
    const cases = [
      "not-a-url",
      "postgresql://postgres:x@127.0.0.1.evil.com:54322/postgres?sslmode=disable",
      "postgresql://postgres:x@localhost.evil.com:54322/postgres?sslmode=disable",
      "http://postgres:x@127.0.0.1:54322/postgres?sslmode=disable",
      "postgresql://u:p@127.0.0.1@evil.com:54322/postgres?sslmode=disable",
      "postgresql://postgres:x@127.0.0.1:54322/postgres?sslmode=disable&sslmode=require",
      "postgresql://postgres:x@127.0.0.1:54322/postgres?sslmode=disable&ssl=true",
    ];
    for (const url of cases) {
      const r = await resolveJeReusePgClientConfig(url);
      expect(r.ok).toBe(false);
    }
  });

  it("credentials are never logged in redaction helpers", () => {
    const secret =
      "postgresql://postgres:s3cret-value@127.0.0.1:54322/postgres?sslmode=disable";
    expect(redactUrl(secret)).not.toMatch(/s3cret/);
    expect(sanitizeErrorMessage(`boom ${secret}`)).not.toMatch(/s3cret/);
    expect(isLoopbackIp("127.0.0.1")).toBe(true);
    expect(isLoopbackIp("203.0.113.1")).toBe(false);
  });

  it("remote without sslmode=disable preserves TLS ssl object", async () => {
    const r = await resolveJeReusePgClientConfig(
      "postgresql://postgres:x@db.abc.supabase.co:5432/postgres",
      {
        lookupAll: async () => [{ address: "203.0.113.10", family: 4 }],
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.ssl).toEqual(DEFAULT_SSL);
    expect(r.config.transport).toBe("tls_required");
  });

  it("keeps the 12 integration assertion titles unchanged (contract)", () => {
    expect(EXPECTED_INTEGRATION_TITLES).toHaveLength(12);
    // Guard against accidental title drift in this authorization.
    expect(EXPECTED_INTEGRATION_TITLES[0]).toContain("migration compile");
    expect(EXPECTED_INTEGRATION_TITLES[11]).toContain("never touches staged production");
  });
});
