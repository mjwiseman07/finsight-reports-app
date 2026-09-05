import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeSslmodeDisableVsExplicitSsl,
  assertProbeMatchesSuiteEffective,
  buildLoopbackSslmodeDisableHandoffUrl,
  evaluateSafeLoopbackSslDisablePath,
  resolveEffectiveSsl,
  resolveInstalledPgVersions,
  resolveSuiteEffectiveClientConfig,
  suiteBuildConnectionString,
  SUITE_SSL_OBJECT,
  PR312_SUITE_SSL_CONTRACT,
} from "../../scripts/migration-remediation/option-d-pr312-pg-ssl-precedence.js";
import {
  loadPinnedJeReuseResolver,
  resolvePinnedJeReusePgClientConfig,
  PR312_JE_REUSE_RESOLVER_BLOB,
  PR312_COMMIT,
} from "../../scripts/migration-remediation/option-d-pr312-je-reuse-resolver.js";
import {
  PR312_SUITE_BLOB,
} from "../../scripts/migration-remediation/option-d-vitest-result-gate.js";
import {
  validatePr312DisposableUrl,
  sanitizePgErrorMessage,
} from "../../scripts/migration-remediation/option-d-pr312-env-handoff.js";

const ROOT = path.resolve(__dirname, "../..");
const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("Option D PR312 pg SSL / resolver pin (7f387fe0…)", () => {
  it("pins exact PR #312 commit, suite blob, and resolver blob", () => {
    expect(PR312_COMMIT).toBe("7f387fe0b662e07ad271ee9db7311eeb45eafc25");
    expect(PR312_SUITE_BLOB).toBe("d4afe0584d089d4ad50d479b81a369ca6dbdd168");
    expect(PR312_JE_REUSE_RESOLVER_BLOB).toBe(
      "5178894fc6811d9f9fef84b10fb9294504b4679e",
    );
    expect(PR312_SUITE_SSL_CONTRACT.suiteCommit).toBe(PR312_COMMIT);
    expect(PR312_SUITE_SSL_CONTRACT.suiteBlob).toBe(PR312_SUITE_BLOB);
    expect(PR312_SUITE_SSL_CONTRACT.resolverBlob).toBe(PR312_JE_REUSE_RESOLVER_BLOB);
  });

  it("loads the pinned resolver blob from git", () => {
    const loaded = loadPinnedJeReuseResolver({ root: ROOT, forceReload: true });
    expect(loaded.ok).toBe(true);
    expect(loaded.gitBlobId).toBe(PR312_JE_REUSE_RESOLVER_BLOB);
    expect(typeof loaded.module.resolveJeReusePgClientConfig).toBe("function");
  });

  it("resolves lockfile-pinned pg and pg-connection-string versions", () => {
    const v = resolveInstalledPgVersions(ROOT);
    expect(v.pgVersion).toBe("8.21.0");
    expect(v.pgConnectionStringVersion).toBe("2.13.0");
  });

  it("proves connectionString sslmode=disable overrides explicit ssl object in pg", () => {
    const effective = resolveEffectiveSsl(
      {
        connectionString: `${LOCAL}?sslmode=disable`,
        ssl: { ...SUITE_SSL_OBJECT },
      },
      ROOT,
    );
    expect(effective.ssl).toBe(false);
  });

  it("verified loopback + sslmode=disable → ssl:false via pinned resolver", async () => {
    const suiteEffective = await resolveSuiteEffectiveClientConfig(
      `${LOCAL}?sslmode=disable`,
      ROOT,
    );
    expect(suiteEffective.ok).toBe(true);
    expect(suiteEffective.ssl).toBe(false);
    expect(suiteEffective.transport).toBe("plaintext_loopback");
    expect(suiteEffective.sslmodePresentInConnectionString).toBe(true);
  });

  it("loopback without explicit disable does not silently downgrade", async () => {
    const suiteEffective = await resolveSuiteEffectiveClientConfig(LOCAL, ROOT);
    expect(suiteEffective.ok).toBe(true);
    expect(suiteEffective.ssl).toEqual(SUITE_SSL_OBJECT);
    expect(suiteEffective.transport).toBe("tls_required");
  });

  it("rejects remote/cloud/pooler sslmode=disable via pinned resolver", async () => {
    const remote = await resolvePinnedJeReusePgClientConfig(
      "postgresql://u:p@db.xyz.supabase.co:5432/postgres?sslmode=disable",
      { root: ROOT },
    );
    expect(remote.ok).toBe(false);
    expect(
      remote.failures.some(
        (f) =>
          f.rule === "cloud_or_pooler_sslmode_disable_rejected" ||
          f.rule === "non_loopback_sslmode_disable_rejected",
      ),
    ).toBe(true);

    const pooler = await resolvePinnedJeReusePgClientConfig(
      "postgresql://u:p@aws-0-us.pooler.supabase.com:6543/postgres?sslmode=disable",
      { root: ROOT },
    );
    expect(pooler.ok).toBe(false);
  });

  it("rejects mixed loopback/non-loopback DNS for localhost", async () => {
    const mixed = await resolvePinnedJeReusePgClientConfig(
      "postgresql://u:p@localhost:54322/postgres?sslmode=disable",
      {
        root: ROOT,
        lookupAll: async () => [
          { address: "127.0.0.1" },
          { address: "8.8.8.8" },
        ],
      },
    );
    expect(mixed.ok).toBe(false);
    expect(
      mixed.failures.some((f) => f.rule === "mixed_loopback_non_loopback_resolution"),
    ).toBe(true);
  });

  it("rejects deceptive hosts", async () => {
    const evil = await resolvePinnedJeReusePgClientConfig(
      "postgresql://u:p@127.0.0.1.evil.com:54322/postgres?sslmode=disable",
      { root: ROOT },
    );
    expect(evil.ok).toBe(false);
  });

  it("Option D handoff URL appends sslmode=disable for disposable loopback", () => {
    const built = buildLoopbackSslmodeDisableHandoffUrl(LOCAL);
    expect(built.ok).toBe(true);
    expect(built.url).toMatch(/sslmode=disable/);
    expect(built.redacted).not.toMatch(/postgres:postgres/);
  });

  it("probe must match suite-effective SSL (plaintext equality)", async () => {
    const handoff = buildLoopbackSslmodeDisableHandoffUrl(LOCAL);
    const suiteEffective = await resolveSuiteEffectiveClientConfig(handoff.url!, ROOT);
    expect(suiteEffective.ok).toBe(true);
    const matched = assertProbeMatchesSuiteEffective(
      {
        connectionString: suiteEffective.connectionString,
        ssl: suiteEffective.ssl,
      },
      suiteEffective,
    );
    expect(matched.ok).toBe(true);

    const divergent = assertProbeMatchesSuiteEffective(
      {
        connectionString: suiteEffective.connectionString,
        ssl: { ...SUITE_SSL_OBJECT },
      },
      suiteEffective,
    );
    expect(divergent.ok).toBe(false);
    expect(divergent.failures.some((f) => f.rule === "probe_suite_ssl_divergence")).toBe(
      true,
    );
  });

  it("reports safe loopback SSL-disable path available via pinned resolver", async () => {
    const pathEval = await evaluateSafeLoopbackSslDisablePath({ root: ROOT });
    expect(pathEval.ok).toBe(true);
    expect(pathEval.safeLoopbackSslDisablePathAvailable).toBe(true);
    expect(pathEval.requiresPr312SuitePinChange).toBe(false);
  });

  it("still rejects remote/cloud/pooler and wrong port/db for handoff validation", () => {
    expect(
      validatePr312DisposableUrl(
        "postgresql://postgres:x@db.xyz.supabase.co:5432/postgres",
      ).ok,
    ).toBe(false);
    expect(
      validatePr312DisposableUrl(
        "postgresql://postgres:x@aws-0-us.pooler.supabase.com:6543/postgres",
      ).ok,
    ).toBe(false);
    expect(
      validatePr312DisposableUrl("postgresql://postgres:x@127.0.0.1:5432/postgres").ok,
    ).toBe(false);
    expect(
      validatePr312DisposableUrl("postgresql://postgres:x@127.0.0.1:54322/app").ok,
    ).toBe(false);
  });

  it("redacts credentials from SSL error text", () => {
    const msg = sanitizePgErrorMessage(
      "The server does not support SSL connections postgresql://postgres:s3cret@127.0.0.1:54322/postgres",
    );
    expect(msg).not.toMatch(/s3cret/);
    expect(msg).toMatch(/does not support SSL/i);
  });

  it("does not weaken production SSL (non-loopback never accepted for handoff)", () => {
    const remote = validatePr312DisposableUrl(
      "postgresql://postgres:x@prod.example.com:54322/postgres?sslmode=disable",
    );
    expect(remote.ok).toBe(false);
  });

  it("retains historical strip helper for TLS-path analysis", () => {
    const stripped = suiteBuildConnectionString(`${LOCAL}?sslmode=disable`);
    expect(stripped).not.toMatch(/sslmode/);
    const analysis = analyzeSslmodeDisableVsExplicitSsl(ROOT);
    expect(analysis.urlSslmodeDisableOverridesExplicitSslObject).toBe(true);
    expect(analysis.historicalStripThenExplicitSslRemainsObject).toBe(true);
  });
});
