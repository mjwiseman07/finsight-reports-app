#!/usr/bin/env node
/**
 * PR #312 Option D SSL / transport contract (post test-infra pin 7f387fe0…).
 *
 * Pinned suite uses resolveJeReusePgClientConfig:
 * - loopback + explicit sslmode=disable → ssl:false (plaintext)
 * - otherwise → ssl:{ rejectUnauthorized:false } (no silent downgrade)
 * - non-loopback / cloud / pooler + sslmode=disable → reject
 *
 * Option D disposable handoff therefore sets sslmode=disable only after
 * loopback disposable URL validation, then probes with the same resolver
 * Vitest will use.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const {
  resolvePinnedJeReusePgClientConfig,
  loadPinnedJeReuseResolver,
  PR312_COMMIT,
  PR312_JE_REUSE_RESOLVER_BLOB,
} = require("./option-d-pr312-je-reuse-resolver");
const { PR312_SUITE_BLOB } = require("./option-d-vitest-result-gate");

const SUITE_SSL_OBJECT = { rejectUnauthorized: false };

const PR312_SUITE_SSL_CONTRACT = {
  suiteCommit: PR312_COMMIT,
  suiteBlob: PR312_SUITE_BLOB,
  resolverBlob: PR312_JE_REUSE_RESOLVER_BLOB,
  usesJeReuseResolver: true,
  plaintextOnlyWhen: "sslmode=disable AND proven loopback-only",
  defaultSsl: SUITE_SSL_OBJECT,
  optionDHandoff: "append sslmode=disable for verified disposable loopback URL",
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

/** Historical strip helper (TLS path still deletes sslmode inside resolver). */
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
 * What the pinned PR #312 suite will pass to pg.Client for a given JE_REUSE URL.
 * Delegates to the exact pinned resolver blob.
 */
async function resolveSuiteEffectiveClientConfig(databaseUrl, root, opts = {}) {
  const resolved = await resolvePinnedJeReusePgClientConfig(databaseUrl, {
    root: root || process.cwd(),
    worktreePath: opts.worktreePath,
    lookupAll: opts.lookupAll,
  });
  if (!resolved.ok) {
    return {
      ok: false,
      failures: resolved.failures,
      reason: resolved.reason,
      redacted: resolved.redacted,
      connectionString: null,
      ssl: null,
      sslmodePresentInConnectionString: null,
    };
  }
  const cs = resolved.config.connectionString;
  return {
    ok: true,
    failures: [],
    connectionString: cs,
    ssl: resolved.config.ssl,
    transport: resolved.config.transport,
    hostname: resolved.config.hostname,
    port: resolved.config.port,
    database: resolved.config.database,
    sslmode: resolved.config.sslmode,
    sslmodePresentInConnectionString: /[?&]sslmode=/i.test(cs),
    redacted: resolved.redacted,
    credentialsIncludedInEvidence: false,
  };
}

/**
 * Append/set sslmode=disable for a validated disposable loopback URL.
 * Does not log credentials. Rejects conflicting non-disable sslmode values.
 */
function buildLoopbackSslmodeDisableHandoffUrl(verifiedUrl) {
  const failures = [];
  let u;
  try {
    u = new URL(String(verifiedUrl));
  } catch {
    return {
      ok: false,
      failures: [{ rule: "handoff_url_unparseable" }],
      url: null,
      redacted: "(unparseable)",
    };
  }
  const existing = u.searchParams.getAll("sslmode").map((m) => String(m).toLowerCase());
  const unique = [...new Set(existing)];
  if (unique.length > 1) {
    failures.push({ rule: "conflicting_sslmode_values", sslmodes: unique });
  }
  if (unique.some((m) => m && m !== "disable")) {
    failures.push({
      rule: "non_disable_sslmode_on_disposable_handoff_rejected",
      sslmodes: unique,
    });
  }
  if (
    u.searchParams.has("sslrootcert") ||
    u.searchParams.has("sslcert") ||
    u.searchParams.has("sslkey")
  ) {
    failures.push({ rule: "ssl_material_params_rejected_on_handoff" });
  }
  if (failures.length) {
    return { ok: false, failures, url: null, redacted: `host=${u.hostname}` };
  }
  u.searchParams.delete("sslmode");
  u.searchParams.set("sslmode", "disable");
  return {
    ok: true,
    failures: [],
    url: u.toString(),
    redacted: `host=${u.hostname};port=${u.port || "(default)"};db=${(u.pathname || "/").replace(/^\//, "") || "(none)"};sslmode=disable`,
  };
}

/**
 * Probe must match suite-effective Client options exactly.
 */
function assertProbeMatchesSuiteEffective(probeConfig, suiteEffective) {
  const failures = [];
  if (!suiteEffective || suiteEffective.ok === false) {
    failures.push({ rule: "suite_effective_unavailable" });
    return { ok: false, failures };
  }
  const probeSsl = probeConfig && probeConfig.ssl;
  const suiteSsl = suiteEffective && suiteEffective.ssl;

  const normalizeSsl = (ssl) => {
    if (ssl === false) return { kind: "false" };
    if (ssl === true) return { kind: "true" };
    if (ssl && typeof ssl === "object") {
      return {
        kind: "object",
        rejectUnauthorized: Boolean(ssl.rejectUnauthorized) === false ? false : true,
      };
    }
    return { kind: "other", value: ssl };
  };

  const p = normalizeSsl(probeSsl);
  const s = normalizeSsl(suiteSsl);
  if (p.kind !== s.kind) {
    failures.push({
      rule: "probe_suite_ssl_divergence",
      probe: p,
      suite: s,
    });
  } else if (p.kind === "object" && p.rejectUnauthorized !== s.rejectUnauthorized) {
    failures.push({
      rule: "probe_suite_rejectUnauthorized_divergence",
      probe: p.rejectUnauthorized,
      suite: s.rejectUnauthorized,
    });
  }

  const probeCs = probeConfig && probeConfig.connectionString;
  if (
    probeCs &&
    suiteEffective &&
    suiteEffective.connectionString &&
    String(probeCs) !== String(suiteEffective.connectionString)
  ) {
    failures.push({ rule: "probe_suite_connection_string_divergence" });
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Safe loopback plaintext path is available via pinned resolver + sslmode=disable.
 */
async function evaluateSafeLoopbackSslDisablePath(opts = {}) {
  const loaded = loadPinnedJeReuseResolver({ root: opts.root });
  if (!loaded.ok) {
    return {
      ok: false,
      safeLoopbackSslDisablePathAvailable: false,
      requiresPr312SuitePinChange: false,
      failures: loaded.failures,
    };
  }
  const scheme = "postgresql";
  const local = `${scheme}://${"u"}:${"p"}@127.0.0.1:54322/postgres?sslmode=disable`;
  const resolved = await resolvePinnedJeReusePgClientConfig(local, {
    root: opts.root,
    lookupAll: opts.lookupAll,
  });
  const remote = await resolvePinnedJeReusePgClientConfig(
    `${scheme}://${"u"}:${"p"}@db.example.supabase.co:5432/postgres?sslmode=disable`,
    { root: opts.root, lookupAll: opts.lookupAll },
  );
  const noDisable = await resolvePinnedJeReusePgClientConfig(
    `${scheme}://${"u"}:${"p"}@127.0.0.1:54322/postgres`,
    { root: opts.root, lookupAll: opts.lookupAll },
  );

  const failures = [];
  if (!(resolved.ok && resolved.config.ssl === false)) {
    failures.push({ rule: "loopback_disable_did_not_yield_ssl_false" });
  }
  if (remote.ok) {
    failures.push({ rule: "remote_sslmode_disable_should_reject" });
  }
  if (!(noDisable.ok && noDisable.config.ssl && typeof noDisable.config.ssl === "object")) {
    failures.push({ rule: "loopback_without_disable_must_keep_ssl_object" });
  }

  return {
    ok: failures.length === 0,
    safeLoopbackSslDisablePathAvailable: failures.length === 0,
    requiresPr312SuitePinChange: false,
    failures,
    contract: PR312_SUITE_SSL_CONTRACT,
    samples: {
      loopbackDisableTransport: resolved.ok ? resolved.config.transport : null,
      remoteRejected: !remote.ok,
      loopbackNoDisableTransport: noDisable.ok ? noDisable.config.transport : null,
    },
  };
}

/**
 * pg merge still shows URL sslmode=disable overrides explicit ssl object —
 * retained as lockfile proof; suite no longer strips before Client when disable+loopback.
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
  const afterHistoricalStrip = resolveEffectiveSsl(
    {
      connectionString: suiteBuildConnectionString(withDisable),
      ssl: { ...SUITE_SSL_OBJECT },
    },
    root,
  );
  return {
    versions: resolveInstalledPgVersions(root || process.cwd()),
    urlSslmodeDisableOverridesExplicitSslObject: urlOverridesExplicit.ssl === false,
    historicalStripThenExplicitSslRemainsObject:
      afterHistoricalStrip.ssl &&
      typeof afterHistoricalStrip.ssl === "object" &&
      afterHistoricalStrip.ssl.rejectUnauthorized === false,
    contract: PR312_SUITE_SSL_CONTRACT,
    conclusion:
      "Pinned suite (7f387fe0…) uses resolveJeReusePgClientConfig: loopback+sslmode=disable → ssl:false. Option D handoff must set sslmode=disable on verified disposable URLs so probe and Vitest share plaintext_loopback.",
  };
}

module.exports = {
  SUITE_SSL_OBJECT,
  PR312_SUITE_SSL_CONTRACT,
  resolveInstalledPgVersions,
  suiteBuildConnectionString,
  resolveEffectiveSsl,
  resolveSuiteEffectiveClientConfig,
  buildLoopbackSslmodeDisableHandoffUrl,
  analyzeSslmodeDisableVsExplicitSsl,
  assertProbeMatchesSuiteEffective,
  evaluateSafeLoopbackSslDisablePath,
  loadPinnedJeReuseResolver,
  resolvePinnedJeReusePgClientConfig,
};
