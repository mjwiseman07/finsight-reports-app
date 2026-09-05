#!/usr/bin/env node
/**
 * Exact pg@lockfile SSL precedence analysis for PR #312 Option D handoff.
 *
 * Proven against installed packages (see resolveInstalledPgVersions):
 *   ConnectionParameters merges as:
 *     config = Object.assign({}, config, parse(config.connectionString))
 *   then:
 *     this.ssl = typeof config.ssl === 'undefined' ? PGSSLMODE/defaults : config.ssl
 *
 * Therefore:
 * - `?sslmode=disable` in the connectionString OVERRIDES an explicit
 *   `ssl: { rejectUnauthorized: false }` when both are passed to Client/ConnectionParameters
 *   (parse result is assigned last).
 * - PGSSLMODE is ignored when `ssl` is explicitly present on the config object.
 * - The pinned PR #312 suite calls buildConnectionString() which deletes sslmode,
 *   then constructs Client({ connectionString: stripped, ssl: { rejectUnauthorized: false } }).
 *   After that strip, effective ssl is the explicit object — URL sslmode cannot help.
 *
 * Safe remediation via JE_REUSE URL alone is therefore impossible without changing
 * the pinned suite. Local Supabase Postgres does not speak TLS; suite requires SSL
 * object → transport incompatibility. PR #312 test-infra pin change required.
 */
const fs = require("fs");
const path = require("path");

const SUITE_SSL_OBJECT = { rejectUnauthorized: false };

const PR312_SUITE_SSL_CONTRACT = {
  suiteCommit: "f65730b3d38e9cb3b192e54f62c798c74a07a1c2",
  suiteBlob: "6dfc99e23b8206d3d70b19c8a7d4758d22e0f770",
  buildConnectionStringDeletesSslmode: true,
  clientOptions: {
    connectionStringFrom: "buildConnectionString(TEST_DB_URL)",
    ssl: SUITE_SSL_OBJECT,
  },
  blockerRule: "pr312_suite_explicit_ssl_requires_tls_or_suite_change",
  blockerDetail:
    "Pinned suite strips sslmode then sets ssl:{rejectUnauthorized:false}. Local Supabase Postgres rejects SSL. URL/env cannot override after strip. Harness must not monkey-patch Client or weaken SSL for non-loopback. Requires PR #312 test-infra change + new pin (or separately authorized local Postgres TLS).",
};

function resolveInstalledPgVersions(root) {
  const pgPkg = JSON.parse(
    fs.readFileSync(path.join(root, "node_modules", "pg", "package.json"), "utf8"),
  );
  const pcsPkg = JSON.parse(
    fs.readFileSync(
      path.join(root, "node_modules", "pg-connection-string", "package.json"),
      "utf8",
    ),
  );
  return {
    pgVersion: pgPkg.version,
    pgConnectionStringVersion: pcsPkg.version,
    connectionParametersPath: require.resolve("pg/lib/connection-parameters", {
      paths: [path.join(root, "node_modules")],
    }),
    parsePath: require.resolve("pg-connection-string", {
      paths: [path.join(root, "node_modules")],
    }),
  };
}

function loadPgInternals(root) {
  const versions = resolveInstalledPgVersions(root);
  const ConnectionParameters = require(versions.connectionParametersPath);
  const { parse } = require(versions.parsePath);
  return { ConnectionParameters, parse, versions };
}

/** Mirror pinned suite buildConnectionString (delete sslmode query param). */
function suiteBuildConnectionString(value) {
  try {
    const parsed = new URL(String(value));
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return String(value);
  }
}

/**
 * Effective ssl after ConnectionParameters merge (exact installed pg).
 */
function resolveEffectiveSsl(config, root) {
  const { ConnectionParameters } = loadPgInternals(root || process.cwd());
  const cp = new ConnectionParameters(config);
  return {
    ssl: cp.ssl,
    host: cp.host,
    port: cp.port,
    database: cp.database,
  };
}

/**
 * What the pinned suite will actually pass to pg.Client for a given JE_REUSE URL.
 */
function resolveSuiteEffectiveClientConfig(databaseUrl, root) {
  const stripped = suiteBuildConnectionString(databaseUrl);
  const effective = resolveEffectiveSsl(
    {
      connectionString: stripped,
      ssl: { ...SUITE_SSL_OBJECT },
    },
    root,
  );
  return {
    connectionString: stripped,
    ssl: effective.ssl,
    host: effective.host,
    port: effective.port,
    database: effective.database,
    sslmodePresentInConnectionString: /[?&]sslmode=/i.test(stripped),
  };
}

/**
 * Prove whether a URL sslmode=disable would override explicit suite ssl IF it
 * survived into Client (it does in pg; suite strip prevents this path).
 */
function analyzeSslmodeDisableVsExplicitSsl(root) {
  const scheme = "postgresql";
  const base = `${scheme}://${"u"}:${"p"}@127.0.0.1:54322/postgres`;
  const withDisable = `${base}?sslmode=disable`;
  const urlOverridesExplicit = resolveEffectiveSsl(
    {
      connectionString: withDisable,
      ssl: { ...SUITE_SSL_OBJECT },
    },
    root,
  );
  const afterSuiteStrip = resolveSuiteEffectiveClientConfig(withDisable, root);
  const pgSslmodeEnvOnly = (() => {
    const prev = process.env.PGSSLMODE;
    process.env.PGSSLMODE = "disable";
    try {
      return resolveEffectiveSsl(
        {
          connectionString: base,
          ssl: { ...SUITE_SSL_OBJECT },
        },
        root,
      );
    } finally {
      if (prev === undefined) delete process.env.PGSSLMODE;
      else process.env.PGSSLMODE = prev;
    }
  })();

  return {
    versions: resolveInstalledPgVersions(root || process.cwd()),
    urlSslmodeDisableOverridesExplicitSslObject:
      urlOverridesExplicit.ssl === false,
    suiteStripThenExplicitSslRemainsObject:
      afterSuiteStrip.ssl &&
      typeof afterSuiteStrip.ssl === "object" &&
      afterSuiteStrip.ssl.rejectUnauthorized === false,
    pgSslmodeEnvIgnoredWhenExplicitSslPresent:
      pgSslmodeEnvOnly.ssl &&
      typeof pgSslmodeEnvOnly.ssl === "object" &&
      pgSslmodeEnvOnly.ssl.rejectUnauthorized === false,
    suiteEffectiveIgnoresUrlSslmodeDisable:
      afterSuiteStrip.sslmodePresentInConnectionString === false,
    conclusion:
      "A (JE_REUSE?sslmode=disable) cannot remediate: suite deletes sslmode then sets ssl object. B (URL/env-only harness) insufficient. C (local Supabase Postgres TLS) not a supported ephemeral db.tls enablement. Blocker: PR #312 suite pin change required.",
    contract: PR312_SUITE_SSL_CONTRACT,
  };
}

/**
 * Reject probe configs that diverge from suite-effective Client options.
 * Probe must mirror Vitest; ssl:false while suite uses ssl object is rejected.
 */
function assertProbeMatchesSuiteEffective(probeConfig, suiteEffective) {
  const failures = [];
  const probeSsl = probeConfig && probeConfig.ssl;
  const suiteSsl = suiteEffective && suiteEffective.ssl;
  const probeRequiresSsl =
    probeSsl === true || (probeSsl && typeof probeSsl === "object");
  const suiteRequiresSsl =
    suiteSsl === true || (suiteSsl && typeof suiteSsl === "object");
  if (probeRequiresSsl !== suiteRequiresSsl) {
    failures.push({
      rule: "probe_suite_ssl_divergence",
      probeRequiresSsl,
      suiteRequiresSsl,
    });
  }
  if (
    probeRequiresSsl &&
    suiteRequiresSsl &&
    typeof probeSsl === "object" &&
    typeof suiteSsl === "object" &&
    Boolean(probeSsl.rejectUnauthorized) !== Boolean(suiteSsl.rejectUnauthorized)
  ) {
    failures.push({
      rule: "probe_suite_rejectUnauthorized_divergence",
      probe: probeSsl.rejectUnauthorized,
      suite: suiteSsl.rejectUnauthorized,
    });
  }
  const probeCs = probeConfig && probeConfig.connectionString;
  if (
    probeCs &&
    suiteEffective &&
    suiteEffective.connectionString &&
    String(probeCs) !== String(suiteEffective.connectionString)
  ) {
    failures.push({
      rule: "probe_suite_connection_string_divergence",
    });
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Classify whether a safe harness-only SSL-disable path exists for this URL.
 * Always false for the pinned suite contract (strip + explicit ssl).
 */
function evaluateSafeLoopbackSslDisablePath(opts = {}) {
  const failures = [];
  const analysis = analyzeSslmodeDisableVsExplicitSsl(opts.root);
  if (!analysis.urlSslmodeDisableOverridesExplicitSslObject) {
    failures.push({ rule: "pg_url_sslmode_does_not_override_explicit" });
  }
  if (analysis.suiteStripThenExplicitSslRemainsObject) {
    failures.push({
      rule: "suite_strip_makes_url_sslmode_ineffective",
      detail: PR312_SUITE_SSL_CONTRACT.blockerDetail,
    });
  }
  failures.push({
    rule: PR312_SUITE_SSL_CONTRACT.blockerRule,
    detail: PR312_SUITE_SSL_CONTRACT.blockerDetail,
  });
  return {
    ok: false,
    safeLoopbackSslDisablePathAvailable: false,
    requiresPr312SuitePinChange: true,
    failures,
    analysis,
  };
}

module.exports = {
  SUITE_SSL_OBJECT,
  PR312_SUITE_SSL_CONTRACT,
  resolveInstalledPgVersions,
  suiteBuildConnectionString,
  resolveEffectiveSsl,
  resolveSuiteEffectiveClientConfig,
  analyzeSslmodeDisableVsExplicitSsl,
  assertProbeMatchesSuiteEffective,
  evaluateSafeLoopbackSslDisablePath,
};
