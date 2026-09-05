import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeSslmodeDisableVsExplicitSsl,
  assertProbeMatchesSuiteEffective,
  evaluateSafeLoopbackSslDisablePath,
  resolveEffectiveSsl,
  resolveInstalledPgVersions,
  resolveSuiteEffectiveClientConfig,
  suiteBuildConnectionString,
  SUITE_SSL_OBJECT,
  PR312_SUITE_SSL_CONTRACT,
} from "../../scripts/migration-remediation/option-d-pr312-pg-ssl-precedence.js";
import {
  validatePr312DisposableUrl,
  sanitizePgErrorMessage,
} from "../../scripts/migration-remediation/option-d-pr312-env-handoff.js";

const ROOT = path.resolve(__dirname, "../..");
const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("Option D PR312 pg SSL precedence (installed lockfile)", () => {
  it("resolves lockfile-pinned pg and pg-connection-string versions", () => {
    const v = resolveInstalledPgVersions(ROOT);
    expect(v.pgVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(v.pgConnectionStringVersion).toMatch(/^\d+\.\d+\.\d+/);
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

  it("proves suite buildConnectionString deletes sslmode so explicit ssl remains", () => {
    const stripped = suiteBuildConnectionString(`${LOCAL}?sslmode=disable`);
    expect(stripped).not.toMatch(/sslmode/);
    const suiteEffective = resolveSuiteEffectiveClientConfig(
      `${LOCAL}?sslmode=disable`,
      ROOT,
    );
    expect(suiteEffective.sslmodePresentInConnectionString).toBe(false);
    expect(suiteEffective.ssl).toEqual(SUITE_SSL_OBJECT);
  });

  it("proves PGSSLMODE is ignored when explicit ssl is present", () => {
    const analysis = analyzeSslmodeDisableVsExplicitSsl(ROOT);
    expect(analysis.urlSslmodeDisableOverridesExplicitSslObject).toBe(true);
    expect(analysis.suiteStripThenExplicitSslRemainsObject).toBe(true);
    expect(analysis.pgSslmodeEnvIgnoredWhenExplicitSslPresent).toBe(true);
    expect(analysis.suiteEffectiveIgnoresUrlSslmodeDisable).toBe(true);
    expect(analysis.versions.pgVersion).toBe("8.21.0");
  });

  it("rejects probe configs that diverge from suite-effective SSL", () => {
    const suiteEffective = resolveSuiteEffectiveClientConfig(LOCAL, ROOT);
    const divergent = assertProbeMatchesSuiteEffective(
      { connectionString: suiteEffective.connectionString, ssl: false },
      suiteEffective,
    );
    expect(divergent.ok).toBe(false);
    expect(divergent.failures.some((f) => f.rule === "probe_suite_ssl_divergence")).toBe(
      true,
    );

    const matched = assertProbeMatchesSuiteEffective(
      {
        connectionString: suiteEffective.connectionString,
        ssl: { ...SUITE_SSL_OBJECT },
      },
      suiteEffective,
    );
    expect(matched.ok).toBe(true);
  });

  it("reports no safe harness-only SSL-disable path for the pinned suite", () => {
    const pathEval = evaluateSafeLoopbackSslDisablePath({ root: ROOT });
    expect(pathEval.ok).toBe(false);
    expect(pathEval.safeLoopbackSslDisablePathAvailable).toBe(false);
    expect(pathEval.requiresPr312SuitePinChange).toBe(true);
    expect(
      pathEval.failures.some((f) => f.rule === PR312_SUITE_SSL_CONTRACT.blockerRule),
    ).toBe(true);
  });

  it("still rejects remote/cloud/pooler and wrong port/db for any SSL-disable candidate", () => {
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
    expect(
      remote.failures.some(
        (f) =>
          f.rule === "non_loopback_host_rejected" ||
          (f.rule === "target_safety_failed" && f.reason === "host_not_in_allowlist"),
      ),
    ).toBe(true);
  });
});
