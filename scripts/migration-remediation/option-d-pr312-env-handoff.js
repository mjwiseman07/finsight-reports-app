#!/usr/bin/env node
/**
 * Fail-closed JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL handoff for PR #312 Vitest.
 *
 * Pinned suite skip / non-execution contract (7f387fe0… / suite blob d4afe058…):
 *   const TEST_DB_URL = process.env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL;
 *   const describeIf = TEST_DB_URL ? describe : describe.skip;
 *   // 12 expected titles under describeIf
 *   // if (!TEST_DB_URL) BLOCKED sentinel describe (passed when URL falsy)
 *   // beforeAll: resolveJeReusePgClientConfig(TEST_DB_URL) → pg.Client(config)
 *
 * Option D disposable path: after loopback URL validation, hand off URL with
 * explicit sslmode=disable so resolver yields ssl:false for local Supabase Postgres.
 * Probe and child Vitest env must share that same effective configuration.
 *
 * Proven skip signatures (Vitest 4.x + isolated worktree launcher):
 * - URL absent → 13 tests (12 skipped + BLOCKED passed), exit 0
 * - URL present + connect fail → 12 skipped, exit 1, failedSuites=2 (~04g class)
 */
"use strict";

const net = require("net");
const crypto = require("crypto");
const { validateIsolatedReplayTarget, redactUrl } = require("./option-d-target-safety");
const {
  SUITE_SSL_OBJECT,
  PR312_SUITE_SSL_CONTRACT,
  suiteBuildConnectionString,
  resolveSuiteEffectiveClientConfig,
  assertProbeMatchesSuiteEffective,
  evaluateSafeLoopbackSslDisablePath,
  buildLoopbackSslmodeDisableHandoffUrl,
} = require("./option-d-pr312-pg-ssl-precedence");
const {
  PR312_COMMIT,
  PR312_SUITE_BLOB,
} = require("./option-d-vitest-result-gate");

const JE_REUSE_ENV = "JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL";

const PR312_SKIP_CONTRACT = {
  suiteCommit: PR312_COMMIT,
  suiteBlob: PR312_SUITE_BLOB,
  envVar: JE_REUSE_ENV,
  mechanismDescribeSkip: "describeIf = TEST_DB_URL ? describe : describe.skip",
  mechanismBeforeAllSkip:
    "beforeAll client.connect() failure → Vitest marks suite tests status=skipped (not failed)",
  expectedTitlesUnderDescribeIf: 12,
  blockedSentinelWhenUrlFalsy:
    "BLOCKED: JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL unavailable",
  suiteClientTransport:
    "resolveJeReusePgClientConfig → ssl:false only for loopback+sslmode=disable",
  suiteClientSslDefault: SUITE_SSL_OBJECT,
  signatureUrlAbsent: {
    total: 13,
    skipped: 12,
    passed: 1,
    blockedPassed: true,
    processExitCode: 0,
    numFailedTestSuites: 0,
  },
  signatureBeforeAllConnectFail: {
    total: 12,
    skipped: 12,
    passed: 0,
    blockedPassed: false,
    processExitCode: 1,
    numFailedTestSuites: 2,
  },
};

/** Parent env keys safe to forward (no secrets, no inherited JE_REUSE). */
const CHILD_ENV_ALLOWLIST = [
  "PATH",
  "Path",
  "PATHEXT",
  "SYSTEMROOT",
  "SystemRoot",
  "WINDIR",
  "TEMP",
  "TMP",
  "TMPDIR",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "HOMEDRIVE",
  "HOMEPATH",
  "COMPUTERNAME",
  "USERNAME",
  "USERDOMAIN",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
  "COMSPEC",
  "TERM",
  "LANG",
  "LC_ALL",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_EXTRA_CA_CERTS",
  "FORCE_COLOR",
  "NO_COLOR",
  "CI",
  "TZ",
];

function nonReversibleFingerprint(url) {
  return crypto
    .createHash("sha256")
    .update(String(url || ""), "utf8")
    .digest("hex")
    .slice(0, 16);
}

function parseUrlParts(dbUrl) {
  try {
    const u = new URL(String(dbUrl));
    return {
      ok: true,
      protocol: u.protocol.replace(/:$/, ""),
      hostname: u.hostname.toLowerCase(),
      port: u.port
        ? Number(u.port)
        : u.protocol === "postgresql:" || u.protocol === "postgres:"
          ? 5432
          : null,
      database: (u.pathname || "/").replace(/^\//, "") || "",
    };
  } catch {
    return { ok: false };
  }
}

/** Strip credentials / connection strings from error text for evidence. */
function sanitizePgErrorMessage(message) {
  let s = String(message || "").slice(0, 240);
  s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"]+/gi, "[redacted-url]");
  s = s.replace(/password\s*=\s*\S+/gi, "password=[redacted]");
  s = s.replace(/:[^:@\s/]+@/g, ":[redacted]@");
  return s;
}

/**
 * Historical TLS-path strip (delete sslmode). Prefer buildLoopbackSslmodeDisableHandoffUrl
 * for Option D disposable handoff.
 */
function buildSuiteMirroredConnectionString(value) {
  return suiteBuildConnectionString(value);
}

/**
 * Reject production/cloud/pooled/remote/ambiguous URLs; require loopback + postgres db + expected port.
 */
function validatePr312DisposableUrl(dbUrl, opts = {}) {
  const failures = [];
  const expectedPort = opts.expectedPort == null ? 54322 : Number(opts.expectedPort);
  const expectedDatabase = opts.expectedDatabase || "postgres";
  const target = validateIsolatedReplayTarget(dbUrl);
  if (!target.ok) {
    failures.push({ rule: "target_safety_failed", reason: target.reason });
    return {
      ok: false,
      failures,
      redacted: target.redacted,
      fingerprint: null,
      skipContract: PR312_SKIP_CONTRACT,
    };
  }
  const parts = parseUrlParts(dbUrl);
  if (!parts.ok) {
    failures.push({ rule: "url_parse_failed" });
  } else {
    if (!["127.0.0.1", "localhost", "::1"].includes(parts.hostname)) {
      failures.push({
        rule: "non_loopback_host_rejected",
        hostname: parts.hostname,
      });
    }
    if (parts.port !== expectedPort) {
      failures.push({
        rule: "unexpected_database_port",
        expectedPort,
        observedPort: parts.port,
      });
    }
    if (parts.database !== expectedDatabase) {
      failures.push({
        rule: "unexpected_database_name",
        expectedDatabase,
        observedDatabase: parts.database,
      });
    }
    if (!/^postgres(ql)?$/i.test(parts.protocol)) {
      failures.push({ rule: "unexpected_protocol", protocol: parts.protocol });
    }
  }

  const raw = String(dbUrl || "");
  if (/supabase\.(co|com)/i.test(raw) || /pooler/i.test(raw)) {
    failures.push({ rule: "cloud_or_pooled_url_rejected" });
  }

  return {
    ok: failures.length === 0,
    failures,
    redacted: redactUrl(dbUrl),
    fingerprint: failures.length ? null : nonReversibleFingerprint(dbUrl),
    hostname: parts.ok ? parts.hostname : null,
    port: parts.ok ? parts.port : null,
    database: parts.ok ? parts.database : null,
    skipContract: PR312_SKIP_CONTRACT,
  };
}

/**
 * Build child env: allowlist only + verified JE_REUSE handoff URL (sslmode=disable).
 * Inherited JE_REUSE is dropped.
 */
function buildPr312ChildEnv(opts = {}) {
  const failures = [];
  const parentEnv = opts.parentEnv || process.env;
  const verifiedUrl = opts.verifiedUrl;
  if (!verifiedUrl || !String(verifiedUrl).trim()) {
    failures.push({ rule: "missing_verified_url_for_child_env" });
    return { ok: false, failures, env: null, handoff: null };
  }

  const urlCheck = validatePr312DisposableUrl(verifiedUrl, {
    expectedPort: opts.expectedPort,
    expectedDatabase: opts.expectedDatabase,
  });
  if (!urlCheck.ok) {
    return { ok: false, failures: urlCheck.failures, env: null, handoff: null };
  }

  const handoffUrlBuild =
    opts.handoffUrl != null
      ? { ok: true, failures: [], url: String(opts.handoffUrl) }
      : buildLoopbackSslmodeDisableHandoffUrl(verifiedUrl);
  if (!handoffUrlBuild.ok) {
    return { ok: false, failures: handoffUrlBuild.failures, env: null, handoff: null };
  }

  const inherited = parentEnv[JE_REUSE_ENV];
  const inheritedRejected =
    inherited !== undefined &&
    inherited !== null &&
    String(inherited) !== String(handoffUrlBuild.url);

  const env = { FORCE_COLOR: "0", NO_COLOR: "1" };
  for (const key of CHILD_ENV_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(parentEnv, key) && parentEnv[key] != null) {
      env[key] = String(parentEnv[key]);
    }
  }
  env[JE_REUSE_ENV] = String(handoffUrlBuild.url);

  if (
    Object.keys(env).some(
      (k) => /SECRET|PASSWORD|TOKEN|PRIVATE/i.test(k) && k !== JE_REUSE_ENV,
    )
  ) {
    failures.push({ rule: "secret_like_key_in_child_env" });
  }

  return {
    ok: failures.length === 0,
    failures,
    env,
    handoff: {
      envVar: JE_REUSE_ENV,
      setExplicitly: true,
      sslmodeDisableAppended: /[?&]sslmode=disable\b/i.test(handoffUrlBuild.url),
      inheritedValueRejected: Boolean(inherited) && inheritedRejected,
      inheritedWasPresent:
        inherited !== undefined && inherited !== null && String(inherited).length > 0,
      allowlistKeyCount: Object.keys(env).length,
      redacted: urlCheck.redacted,
      fingerprint: urlCheck.fingerprint,
      hostname: urlCheck.hostname,
      port: urlCheck.port,
      database: urlCheck.database,
      credentialsIncludedInEvidence: false,
    },
  };
}

/**
 * TCP connectivity to expected host:port (no credential logging).
 */
function probeDisposableDbConnectivity(dbUrl, opts = {}) {
  const parts = parseUrlParts(dbUrl);
  if (!parts.ok) {
    return Promise.resolve({
      ok: false,
      failures: [{ rule: "connectivity_url_unparseable" }],
    });
  }
  const timeoutMs = opts.timeoutMs == null ? 5000 : Number(opts.timeoutMs);
  return new Promise((resolve) => {
    const socket = net.connect({ host: parts.hostname, port: parts.port });
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () =>
      done({ ok: true, failures: [], hostname: parts.hostname, port: parts.port }),
    );
    socket.on("timeout", () =>
      done({ ok: false, failures: [{ rule: "connectivity_timeout", port: parts.port }] }),
    );
    socket.on("error", (err) =>
      done({
        ok: false,
        failures: [
          {
            rule: "connectivity_failed",
            code: err && err.code ? String(err.code) : "unknown",
          },
        ],
      }),
    );
  });
}

/**
 * Suite-mirrored pg connect via pinned resolveJeReusePgClientConfig.
 */
async function probeSuiteMirroredPgConnect(dbUrl, opts = {}) {
  const timeoutMs = opts.timeoutMs == null ? 8000 : Number(opts.timeoutMs);
  const root = opts.root || process.cwd();
  const suiteEffective = await resolveSuiteEffectiveClientConfig(dbUrl, root, {
    worktreePath: opts.worktreePath,
    lookupAll: opts.lookupAll,
  });
  if (!suiteEffective.ok) {
    return {
      ok: false,
      failures: suiteEffective.failures || [
        { rule: "suite_effective_resolve_failed", reason: suiteEffective.reason },
      ],
      mirroredSuiteResolver: true,
      redacted: suiteEffective.redacted,
    };
  }

  const probeConfig = {
    connectionString: suiteEffective.connectionString,
    ssl: suiteEffective.ssl,
  };
  const match = assertProbeMatchesSuiteEffective(probeConfig, suiteEffective);
  if (!match.ok) {
    return {
      ok: false,
      failures: match.failures,
      mirroredSuiteResolver: true,
      suiteEffective: {
        transport: suiteEffective.transport,
        sslIsFalse: suiteEffective.ssl === false,
        sslmodePresentInConnectionString: suiteEffective.sslmodePresentInConnectionString,
      },
    };
  }

  const { Client } = require("pg");
  const client = new Client({
    connectionString: probeConfig.connectionString,
    ssl: probeConfig.ssl,
    connectionTimeoutMillis: timeoutMs,
  });
  try {
    await client.connect();
    const r = await client.query("SELECT 1 AS ok");
    await client.end();
    const ok = Array.isArray(r.rows) && r.rows[0] && Number(r.rows[0].ok) === 1;
    if (!ok) {
      return {
        ok: false,
        failures: [{ rule: "suite_mirrored_pg_select_failed" }],
        mirroredSuiteResolver: true,
      };
    }
    return {
      ok: true,
      failures: [],
      mirroredSuiteResolver: true,
      selectOk: true,
      probeMatchedSuite: true,
      transport: suiteEffective.transport,
      sslIsFalse: suiteEffective.ssl === false,
    };
  } catch (err) {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    const message = sanitizePgErrorMessage(err && err.message);
    return {
      ok: false,
      failures: [
        {
          rule: "suite_mirrored_pg_connect_failed",
          code: err && err.code ? String(err.code) : null,
          message,
        },
      ],
      mirroredSuiteResolver: true,
      probeMatchedSuite: true,
      transport: suiteEffective.transport,
    };
  }
}

/**
 * Prove child env actually exposes JE_REUSE (same allowlist env object Vitest will get).
 */
function probeChildEnvHandoff(childEnv) {
  const failures = [];
  if (!childEnv || typeof childEnv !== "object") {
    failures.push({ rule: "child_env_missing" });
    return { ok: false, failures };
  }
  const value = childEnv[JE_REUSE_ENV];
  if (!value || !String(value).trim()) {
    failures.push({ rule: "child_env_missing_je_reuse" });
  }
  for (const key of Object.keys(childEnv)) {
    if (key === JE_REUSE_ENV) continue;
    if (/SECRET|PASSWORD|TOKEN|PRIVATE|DATABASE_URL/i.test(key)) {
      failures.push({ rule: "child_env_unexpected_secret_like_key", key });
    }
  }
  return {
    ok: failures.length === 0,
    failures,
    jeReusePresent: Boolean(value && String(value).trim()),
    sslmodeDisable:
      typeof value === "string" && /[?&]sslmode=disable\b/i.test(value),
  };
}

/**
 * Full pre-spawn gate for PR #312 Vitest.
 */
async function authorizePr312VitestLaunch(opts = {}) {
  const failures = [];
  if (opts.candidateReplayPassed !== true) {
    failures.push({ rule: "candidate_replay_not_passed_same_run" });
  }
  if (opts.securityImmutabilityPassed !== true) {
    failures.push({ rule: "security_immutability_not_passed_same_run" });
  }
  if (!opts.isolatedContextOk) {
    failures.push({ rule: "isolated_pr312_context_not_ready" });
  }

  const urlCheck = validatePr312DisposableUrl(opts.databaseUrl, {
    expectedPort: opts.expectedPort,
    expectedDatabase: opts.expectedDatabase,
  });
  if (!urlCheck.ok) {
    failures.push(...urlCheck.failures);
  }

  let handoffUrlBuild = { ok: false, failures: [{ rule: "handoff_url_not_attempted" }], url: null };
  let childEffective = null;
  let probeEffective = null;

  if (urlCheck.ok) {
    handoffUrlBuild = buildLoopbackSslmodeDisableHandoffUrl(opts.databaseUrl);
    if (!handoffUrlBuild.ok) {
      failures.push(...handoffUrlBuild.failures);
    } else {
      childEffective = await resolveSuiteEffectiveClientConfig(
        handoffUrlBuild.url,
        opts.root || process.cwd(),
        { worktreePath: opts.worktreePath, lookupAll: opts.lookupAll },
      );
      if (!childEffective.ok) {
        failures.push(...(childEffective.failures || [{ rule: "child_effective_resolve_failed" }]));
      } else if (childEffective.ssl !== false || childEffective.transport !== "plaintext_loopback") {
        failures.push({
          rule: "handoff_must_resolve_plaintext_loopback",
          transport: childEffective.transport,
          sslIsFalse: childEffective.ssl === false,
        });
      }
    }
  }

  let tcp = { ok: false, failures: [{ rule: "tcp_connectivity_not_attempted" }] };
  let pgProbe = { ok: false, failures: [{ rule: "suite_mirrored_pg_not_attempted" }] };
  if (urlCheck.ok && handoffUrlBuild.ok) {
    tcp = await probeDisposableDbConnectivity(opts.databaseUrl, {
      timeoutMs: opts.connectivityTimeoutMs,
    });
    if (!tcp.ok) failures.push(...tcp.failures);

    if (tcp.ok) {
      pgProbe = await probeSuiteMirroredPgConnect(handoffUrlBuild.url, {
        timeoutMs: opts.pgProbeTimeoutMs,
        root: opts.root,
        worktreePath: opts.worktreePath,
        lookupAll: opts.lookupAll,
      });
      if (!pgProbe.ok) failures.push(...pgProbe.failures);
      else {
        probeEffective = {
          transport: pgProbe.transport,
          sslIsFalse: pgProbe.sslIsFalse === true,
        };
        if (
          childEffective &&
          childEffective.ok &&
          (probeEffective.sslIsFalse !== true ||
            probeEffective.transport !== childEffective.transport)
        ) {
          failures.push({ rule: "probe_child_effective_divergence" });
        }
      }
    }
  }

  const child =
    urlCheck.ok && handoffUrlBuild.ok
      ? buildPr312ChildEnv({
          verifiedUrl: opts.databaseUrl,
          handoffUrl: handoffUrlBuild.url,
          parentEnv: opts.parentEnv,
          expectedPort: opts.expectedPort,
          expectedDatabase: opts.expectedDatabase,
        })
      : {
          ok: false,
          failures: [{ rule: "child_env_skipped_due_to_url_failure" }],
          env: null,
          handoff: null,
        };
  if (!child.ok) failures.push(...child.failures);

  const envProbe = child.env
    ? probeChildEnvHandoff(child.env)
    : { ok: false, failures: [{ rule: "child_env_probe_skipped" }] };
  if (!envProbe.ok) failures.push(...envProbe.failures);
  if (envProbe.ok && envProbe.sslmodeDisable !== true) {
    failures.push({ rule: "child_env_missing_sslmode_disable" });
  }

  if (!opts.databaseUrl || !String(opts.databaseUrl).trim()) {
    failures.push({
      rule: "missing_url_would_cause_describe_skip",
      detail: PR312_SKIP_CONTRACT.mechanismDescribeSkip,
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    skipContract: PR312_SKIP_CONTRACT,
    sslContract: PR312_SUITE_SSL_CONTRACT,
    urlCheck: {
      ok: urlCheck.ok,
      failures: urlCheck.failures,
      redacted: urlCheck.redacted,
      fingerprint: urlCheck.fingerprint,
      hostname: urlCheck.hostname,
      port: urlCheck.port,
      database: urlCheck.database,
    },
    connectivity: {
      tcpOk: tcp.ok === true,
      pgOk: pgProbe.ok === true,
      hostname: tcp.hostname || urlCheck.hostname || null,
      port: tcp.port || urlCheck.port || null,
      suiteMirroredResolver: true,
      transport: pgProbe.transport || (childEffective && childEffective.transport) || null,
      sslIsFalse:
        pgProbe.sslIsFalse === true ||
        (childEffective && childEffective.ssl === false) ||
        false,
    },
    childEnv: failures.length === 0 ? child.env : null,
    handoff: child.handoff,
    envProbe: {
      ok: envProbe.ok,
      jeReusePresent: envProbe.jeReusePresent === true,
      sslmodeDisable: envProbe.sslmodeDisable === true,
    },
    probeChildEquality:
      failures.length === 0
        ? { ok: true, transport: "plaintext_loopback", ssl: false }
        : { ok: false },
  };
}

/**
 * Classify skip patterns without credentials.
 */
function captureSkipDiagnosisFromStructuredCounts(input = {}) {
  const counts = input.counts || input || {};
  const skipped = Number(counts.skipped || 0);
  const passed = Number(counts.passed || 0);
  const total = Number(counts.total || 0);
  const failedSuites = Number(
    input.numFailedTestSuites ?? input.report?.numFailedTestSuites ?? 0,
  );
  const titles = Array.isArray(input.assertionTitles) ? input.assertionTitles : [];
  const blockedPassed = titles.some(
    (t) =>
      t &&
      String(t.title || "").includes("BLOCKED:") &&
      String(t.status || "") === "passed",
  );

  if (skipped === 12 && passed === 1 && total === 13 && blockedPassed) {
    return {
      classification: "describe_skip_je_reuse_falsy",
      likelyCause: PR312_SKIP_CONTRACT.mechanismDescribeSkip,
      envVar: JE_REUSE_ENV,
      evidenceSafe: true,
      matches04g: false,
    };
  }
  if (skipped === 12 && passed === 0 && total === 12 && !blockedPassed) {
    return {
      classification: "beforeAll_connect_failure_reported_as_skipped",
      likelyCause: PR312_SKIP_CONTRACT.mechanismBeforeAllSkip,
      envVar: JE_REUSE_ENV,
      evidenceSafe: true,
      matches04g: true,
      numFailedTestSuites: failedSuites,
      note:
        "JE_REUSE was truthy (no BLOCKED sentinel). Vitest reported suite tests as skipped after beforeAll connect failure — same signature as 2026-09-04g.",
    };
  }
  if (skipped > 0) {
    return {
      classification: "partial_or_unexpected_skips",
      skipped,
      passed,
      total,
      envVar: JE_REUSE_ENV,
      evidenceSafe: true,
      matches04g: false,
    };
  }
  return { classification: "no_skips", evidenceSafe: true, matches04g: false };
}

module.exports = {
  JE_REUSE_ENV,
  PR312_SKIP_CONTRACT,
  CHILD_ENV_ALLOWLIST,
  validatePr312DisposableUrl,
  buildPr312ChildEnv,
  buildSuiteMirroredConnectionString,
  buildLoopbackSslmodeDisableHandoffUrl,
  probeDisposableDbConnectivity,
  probeSuiteMirroredPgConnect,
  probeChildEnvHandoff,
  authorizePr312VitestLaunch,
  captureSkipDiagnosisFromStructuredCounts,
  nonReversibleFingerprint,
  sanitizePgErrorMessage,
  redactUrl,
  evaluateSafeLoopbackSslDisablePath,
  PR312_SUITE_SSL_CONTRACT,
  SUITE_SSL_OBJECT,
};
