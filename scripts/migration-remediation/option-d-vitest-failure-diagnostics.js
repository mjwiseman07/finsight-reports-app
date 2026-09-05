#!/usr/bin/env node
/**
 * Sanitized PR #312 Vitest failure diagnostics for Option D.
 *
 * Persist structured, redacted failure evidence BEFORE deleting the raw Vitest
 * JSON report and before tearing down the detached worktree.
 *
 * Fail closed: when Vitest fails but a complete sanitized artifact cannot be
 * preserved, callers must use reason `vitest_failure_diagnostics_incomplete`
 * and must never treat the run as diagnostically sufficient or PASS.
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  EXPECTED_PR312_TEST_TITLES,
  PR312_COMMIT,
  PR312_SUITE_PATH,
  PR312_SUITE_BLOB,
  PR312_JE_REUSE_RESOLVER_BLOB,
} = require("./option-d-vitest-result-gate");

const SCHEMA_VERSION = 1;
const KIND = "option_d_pr312_vitest_failure_diagnostics";
const INCOMPLETE_REASON = "vitest_failure_diagnostics_incomplete";

const DEFAULT_MAX_MESSAGE_CHARS = 480;
const DEFAULT_MAX_STACK_FRAMES = 8;
const DEFAULT_MAX_ARTIFACT_CHARS = 200_000;

const REDACTION_MARKERS = Object.freeze([
  "[redacted-url]",
  "[redacted-password]",
  "[redacted-token]",
  "[redacted-env]",
  "[redacted-temp-path]",
  "[redacted-uuid]",
  "[redacted-hex64]",
  "[redacted-param]",
  "[redacted-fixture]",
  "[truncated]",
]);

function sha256Text(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

/**
 * Redact credentials, URLs, temp paths, fixture-looking values, and raw params.
 */
function sanitizeDiagnosticText(input, opts = {}) {
  const maxChars = opts.maxChars == null ? DEFAULT_MAX_MESSAGE_CHARS : Number(opts.maxChars);
  let s = String(input || "");
  let truncated = false;

  s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"`]+/gi, "[redacted-url]");
  s = s.replace(
    /\b((?:DATABASE_URL|JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL|OPTION_D_DATABASE_URL))\s*=\s*[^\s;]+/gi,
    "$1=[redacted-env]",
  );
  s = s.replace(/password\s*=\s*\S+/gi, "password=[redacted-password]");
  s = s.replace(/:[^:@\s/]+@/g, ":[redacted-password]@");
  s = s.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-token]");
  s = s.replace(/\b(?:api[_-]?key|token|cookie|authorization)\s*[:=]\s*\S+/gi, "[redacted-token]");
  // Detached worktree / temp absolute paths (Windows + POSIX, either slash)
  s = s.replace(
    /(?:file:\/\/\/)?[A-Za-z]:(?:\\|\/)[^\s)'"]*?option-d-pr312-worktree-[^/\\]+(?:\\|\/)tree(?:\\|\/)/gi,
    "",
  );
  s = s.replace(
    /(?:file:\/\/)?\/(?:tmp|private\/tmp|var\/folders)[^\s)'"]*?option-d-pr312-worktree-[^/\\]+\/tree\//gi,
    "",
  );
  s = s.replace(
    /(?:file:\/\/\/)?[A-Za-z]:(?:\\|\/)[^\s)'"]*?(?:AppData(?:\\|\/)Local(?:\\|\/)Temp|Temp)[^\s)'"]*/gi,
    "[redacted-temp-path]",
  );
  s = s.replace(
    /(?:file:\/\/)?\/(?:tmp|private\/tmp|var\/folders)[^\s)'"]*/gi,
    "[redacted-temp-path]",
  );
  s = s.replace(/file:\/\/\/[A-Za-z]:[^\s)'"]*/gi, "[redacted-temp-path]");
  s = s.replace(/\s+at\s+file:\/\/\/[^\n]+/gi, "");
  s = s.replace(/\s+at\s+[^\n]*node_modules[^\n]*/gi, "");
  s = s.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[redacted-uuid]");
  s = s.replace(/\b[0-9a-f]{64}\b/gi, "[redacted-hex64]");
  // DETAIL / SQL parameter values
  s = s.replace(/\bDETAIL:\s*[^\n|]*/gi, "DETAIL: [redacted-fixture]");
  s = s.replace(/\$\d+\s*=\s*'[^']*'/g, "[redacted-param]");
  s = s.replace(/\$\d+\s*=\s*[^\s|]+/g, "[redacted-param]");
  s = s.replace(/\b(email|user_id|company_id|payload)\s*[:=]\s*[^\s|]+/gi, "$1=[redacted-fixture]");

  if (s.length > maxChars) {
    s = s.slice(0, maxChars) + "…[truncated]";
    truncated = true;
  }
  return { text: s, truncated };
}

function extractSqlSignals(message) {
  const raw = String(message || "");
  const sqlstate =
    (raw.match(/\bsqlstate\s*=\s*([0-9A-Z]{5})\b/i) ||
      raw.match(/\bSQLSTATE:\s*([0-9A-Z]{5})\b/i) ||
      raw.match(/\bcode:\s*['"]?([0-9A-Z]{5})['"]?/i) ||
      [])[1] || null;
  const namedSetupPhase =
    (raw.match(/\bphase\s*=\s*([a-z0-9_]+)/i) ||
      raw.match(/\bjeReuseSeedPhase[=:\s]+([a-z0-9_]+)/i) ||
      [])[1] || null;
  const constraint =
    (raw.match(/constraint\s+"?([a-z0-9_]+)"?/i) ||
      raw.match(/\bviolates check constraint "?([a-z0-9_]+)"?/i) ||
      [])[1] || null;
  const table =
    (raw.match(/relation\s+"([a-z0-9_]+)"/i) ||
      raw.match(/\btable\s+"([a-z0-9_]+)"/i) ||
      [])[1] || null;
  const functionOrRpc =
    (raw.match(
      /\b((?:public\.)?(?:reserve_journal_entry_execution|transition_journal_entry_execution)[a-z0-9_]*)\b/i,
    ) ||
      raw.match(/\bfunction\s+((?:[a-z_][a-z0-9_]*\.)?[a-z_][a-z0-9_]*)\b/i) ||
      [])[1] || null;
  return {
    sqlstate: sqlstate ? String(sqlstate).toUpperCase() : null,
    namedSetupPhase: namedSetupPhase || null,
    constraint: constraint || null,
    table: table || null,
    functionOrRpc: functionOrRpc || null,
  };
}

function isHookFailureMessage(message) {
  return /\b(beforeAll|afterAll|beforeEach|afterEach|hook)\b/i.test(String(message || ""));
}

/**
 * Keep bounded stack frames with repository-relative paths only.
 */
function sanitizeStackFrames(message, opts = {}) {
  const maxFrames = opts.maxFrames == null ? DEFAULT_MAX_STACK_FRAMES : Number(opts.maxFrames);
  const repoRoot = opts.repoRoot ? path.resolve(opts.repoRoot) : null;
  const worktreeTree = opts.worktreePath
    ? path.resolve(opts.worktreePath)
    : null;
  const frames = [];
  const lines = String(message || "").split(/\r?\n/);
  for (const line of lines) {
    const m =
      line.match(/at\s+(?:.+?\s+)?\(?(.+?):(\d+):(\d+)\)?/) ||
      line.match(/^\s*at\s+(.+?):(\d+):(\d+)\s*$/);
    if (!m) continue;
    let filePath = m[1].replace(/^file:\/\//, "").replace(/\//g, path.sep);
    if (/node_modules/i.test(filePath)) continue;
    if (/\[redacted-temp-path\]/i.test(filePath)) continue;

    let rel = null;
    const norm = path.resolve(filePath);
    if (worktreeTree && norm.toLowerCase().startsWith(worktreeTree.toLowerCase() + path.sep)) {
      rel = norm.slice(worktreeTree.length + 1).split(path.sep).join("/");
    } else if (repoRoot && norm.toLowerCase().startsWith(repoRoot.toLowerCase() + path.sep)) {
      rel = norm.slice(repoRoot.length + 1).split(path.sep).join("/");
    } else {
      const treeIdx = filePath.toLowerCase().lastIndexOf(`${path.sep}tree${path.sep}`);
      if (treeIdx >= 0) {
        rel = filePath.slice(treeIdx + `${path.sep}tree${path.sep}`.length).split(path.sep).join("/");
      } else {
        const libIdx = filePath.replace(/\\/g, "/").lastIndexOf("/lib/");
        if (libIdx >= 0) {
          rel = filePath.replace(/\\/g, "/").slice(libIdx + 1);
        }
      }
    }
    if (!rel || rel.includes("..")) continue;
    frames.push({
      path: rel.replace(/\\/g, "/"),
      line: Number(m[2]),
      column: Number(m[3]),
    });
    if (frames.length >= maxFrames) break;
  }
  return frames;
}

function collectAssertionRecords(report) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (Array.isArray(node.assertionResults)) {
      for (const a of node.assertionResults) {
        const failureMessages = []
          .concat(a.failureMessages || [])
          .concat(a.errors ? a.errors.map((e) => e?.message || e) : [])
          .map((x) => String(x || ""));
        out.push({
          title: a.title || a.fullName || "",
          fullName: a.fullName || a.title || "",
          status: String(a.status || "unknown").toLowerCase(),
          durationMs: typeof a.duration === "number" ? a.duration : null,
          failureMessages,
          ancestorTitles: Array.isArray(a.ancestorTitles) ? a.ancestorTitles : [],
        });
      }
    }
    for (const key of ["testResults", "suites", "children", "fileResults", "tests"]) {
      if (Array.isArray(node[key])) walk(node[key]);
    }
  };
  walk(report);
  return out;
}

function collectHookFailures(report, opts = {}) {
  const hooks = [];
  if (!report || typeof report !== "object") return hooks;
  const suites = Array.isArray(report.testResults) ? report.testResults : [];
  for (const tr of suites) {
    const msg = String(tr.message || "");
    if (!msg) continue;
    if (!isHookFailureMessage(msg) && !/teardown|uncaught/i.test(msg)) continue;
    const sanitized = sanitizeDiagnosticText(msg, opts);
    const signals = extractSqlSignals(msg);
    hooks.push({
      suiteName: relativizeSuiteName(tr.name || "", opts),
      sanitizedMessage: sanitized.text,
      messageTruncated: sanitized.truncated,
      hookFailure: true,
      ...signals,
      stackFrames: sanitizeStackFrames(msg, opts),
    });
  }
  return hooks;
}

function relativizeSuiteName(name, opts = {}) {
  const raw = String(name || "");
  if (!raw) return "(unnamed)";
  const sanitized = sanitizeDiagnosticText(raw, { maxChars: 240 });
  let s = sanitized.text;
  if (opts.worktreePath) {
    const prefix = path.resolve(opts.worktreePath) + path.sep;
    if (path.resolve(raw).toLowerCase().startsWith(prefix.toLowerCase())) {
      s = path.resolve(raw).slice(prefix.length).split(path.sep).join("/");
    }
  }
  s = s.replace(/\\/g, "/");
  const marker = "lib/journal-entry-governance/";
  const idx = s.indexOf(marker);
  if (idx >= 0) s = s.slice(idx);
  return s;
}

function mapStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pass" || s === "passed") return "passed";
  if (s === "fail" || s === "failed") return "failed";
  if (s === "skip" || s === "skipped") return "skipped";
  if (s === "todo") return "todo";
  if (s === "pending") return "pending";
  return s || "unknown";
}

/**
 * Build sanitized diagnostics for a Vitest run. Does not write disk.
 *
 * @returns {{
 *   ok: boolean,
 *   complete: boolean,
 *   reason: string|null,
 *   incompleteReasons: object[],
 *   artifact: object,
 * }}
 */
function buildSanitizedVitestFailureDiagnostics(input = {}) {
  const expectedTitles = input.expectedTitles || EXPECTED_PR312_TEST_TITLES;
  const maxMessageChars =
    input.maxMessageChars == null ? DEFAULT_MAX_MESSAGE_CHARS : Number(input.maxMessageChars);
  const maxStackFrames =
    input.maxStackFrames == null ? DEFAULT_MAX_STACK_FRAMES : Number(input.maxStackFrames);
  const maxArtifactChars =
    input.maxArtifactChars == null ? DEFAULT_MAX_ARTIFACT_CHARS : Number(input.maxArtifactChars);

  const sanitizeOpts = {
    maxChars: maxMessageChars,
    maxFrames: maxStackFrames,
    repoRoot: input.repoRoot || null,
    worktreePath: input.worktreePath || null,
  };

  const incompleteReasons = [];
  const processExitCode =
    input.processExitCode === undefined ? null : input.processExitCode;
  const signal = input.signal || null;
  const timedOut = input.timedOut === true;
  const report = input.report;

  const vitestFailed =
    timedOut ||
    Boolean(signal) ||
    processExitCode === null ||
    processExitCode === undefined ||
    processExitCode !== 0 ||
    (report &&
      typeof report === "object" &&
      (report.success === false ||
        (typeof report.numFailedTests === "number" && report.numFailedTests > 0) ||
        (typeof report.numFailedTestSuites === "number" && report.numFailedTestSuites > 0)));

  let reporterComplete = false;
  let assertions = [];
  if (!report || typeof report !== "object") {
    incompleteReasons.push({ rule: "vitest_report_absent_or_unparseable" });
  } else {
    assertions = collectAssertionRecords(report);
    reporterComplete =
      Array.isArray(report.testResults) &&
      (assertions.length > 0 || report.numTotalTests === 0);
    if (!reporterComplete) {
      incompleteReasons.push({ rule: "vitest_reporter_incomplete" });
    }
  }

  const byTitle = new Map();
  for (const a of assertions) {
    const title = a.title || "";
    if (!title) continue;
    if (!byTitle.has(title)) byTitle.set(title, a);
  }

  const tests = [];
  for (const title of expectedTitles) {
    const a = byTitle.get(title);
    if (!a) {
      tests.push({
        title,
        status: "absent",
        durationMs: null,
        sanitizedMessage: null,
        messageTruncated: false,
        sqlstate: null,
        namedSetupPhase: null,
        constraint: null,
        table: null,
        functionOrRpc: null,
        hookFailure: false,
        stackFrames: [],
      });
      incompleteReasons.push({ rule: "expected_title_absent_from_report", title });
      continue;
    }
    const status = mapStatus(a.status);
    const rawMsg = (a.failureMessages || []).filter(Boolean).join("\n") || "";
    const sanitized = rawMsg
      ? sanitizeDiagnosticText(rawMsg, sanitizeOpts)
      : { text: null, truncated: false };
    const signals = rawMsg ? extractSqlSignals(rawMsg) : {};
    const entry = {
      title,
      status,
      durationMs: a.durationMs,
      sanitizedMessage: sanitized.text,
      messageTruncated: sanitized.truncated,
      sqlstate: signals.sqlstate || null,
      namedSetupPhase: signals.namedSetupPhase || null,
      constraint: signals.constraint || null,
      table: signals.table || null,
      functionOrRpc: signals.functionOrRpc || null,
      hookFailure: isHookFailureMessage(rawMsg),
      stackFrames: rawMsg ? sanitizeStackFrames(rawMsg, sanitizeOpts) : [],
    };
    if (status === "failed" && !entry.sanitizedMessage) {
      incompleteReasons.push({ rule: "failed_title_missing_message", title });
    }
    tests.push(entry);
  }

  const hooks = collectHookFailures(report, sanitizeOpts);

  const counts = {
    expected: expectedTitles.length,
    accounted: tests.length,
    passed: tests.filter((t) => t.status === "passed").length,
    failed: tests.filter((t) => t.status === "failed").length,
    skipped: tests.filter((t) => t.status === "skipped").length,
    todo: tests.filter((t) => t.status === "todo").length,
    pending: tests.filter((t) => t.status === "pending").length,
    absent: tests.filter((t) => t.status === "absent").length,
  };

  if (counts.accounted !== expectedTitles.length) {
    incompleteReasons.push({
      rule: "expected_title_accounting_mismatch",
      accounted: counts.accounted,
      expected: expectedTitles.length,
    });
  }

  const provenance = {
    commit: input.provenance?.commit || PR312_COMMIT,
    suitePath: input.provenance?.suitePath || PR312_SUITE_PATH,
    suiteBlob: input.provenance?.suiteBlob || PR312_SUITE_BLOB,
    resolverBlob: input.provenance?.resolverBlob || PR312_JE_REUSE_RESOLVER_BLOB,
    testRoot:
      input.provenance?.testRoot ||
      "lib/journal-entry-governance/__tests__",
  };
  for (const key of ["commit", "suiteBlob", "resolverBlob", "suitePath"]) {
    if (!provenance[key]) {
      incompleteReasons.push({ rule: "provenance_field_missing", field: key });
    }
  }

  let artifact = {
    schemaVersion: SCHEMA_VERSION,
    kind: KIND,
    generatedAt: new Date().toISOString(),
    complete: false,
    credentialsIncluded: false,
    vitestFailed,
    pr312: provenance,
    process: {
      exitCode: processExitCode,
      signal,
      timedOut,
      reporterComplete,
    },
    counts,
    tests,
    hooks,
    redaction: {
      applied: true,
      markers: REDACTION_MARKERS.slice(),
    },
    stderrSanitized: input.stderr
      ? sanitizeDiagnosticText(input.stderr, { maxChars: 400 }).text
      : null,
  };

  let serialized = JSON.stringify(artifact);
  if (serialized.length > maxArtifactChars) {
    artifact.artifactTruncated = true;
    artifact.truncationMarker = "[truncated]";
    // Drop stack frames first to shrink.
    for (const t of artifact.tests) t.stackFrames = t.stackFrames.slice(0, 2);
    for (const h of artifact.hooks) h.stackFrames = (h.stackFrames || []).slice(0, 1);
    serialized = JSON.stringify(artifact);
    if (serialized.length > maxArtifactChars) {
      incompleteReasons.push({
        rule: "artifact_exceeds_bound_after_shrink",
        bytes: serialized.length,
        maxArtifactChars,
      });
    }
  }

  // Completeness policy:
  // - If Vitest did not fail: complete when all titles accounted (no absent) and report present.
  // - If Vitest failed: complete only when report present, all titles accounted with no absent,
  //   every failed title has sanitizedMessage, and provenance is present.
  let complete = incompleteReasons.length === 0;
  if (vitestFailed) {
    const failedWithoutMsg = tests.some(
      (t) => t.status === "failed" && !t.sanitizedMessage,
    );
    if (failedWithoutMsg || counts.absent > 0 || !report) {
      complete = false;
    }
  } else if (!report || counts.absent > 0) {
    complete = false;
  }

  artifact.complete = complete;

  // When Vitest failed and diagnostics are incomplete, surface the distinct reason.
  const reason =
    vitestFailed && !complete
      ? INCOMPLETE_REASON
      : complete
        ? null
        : incompleteReasons[0]?.rule || "diagnostics_incomplete";

  return {
    ok: complete,
    complete,
    reason,
    incompleteReasons,
    artifact,
    vitestFailed,
  };
}

/**
 * Persist sanitized artifact under docs/migration-remediation and verify round-trip.
 * Caller deletes the raw report afterward.
 */
function persistSanitizedVitestDiagnosticsArtifact(diagnostics, opts = {}) {
  const root = opts.repoRoot || process.cwd();
  const dir =
    opts.evidenceDir ||
    path.join(root, "docs", "migration-remediation");
  fs.mkdirSync(dir, { recursive: true });
  const stamp =
    opts.stamp ||
    new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
  const fileName =
    opts.fileName || `option-d-pr312-vitest-diagnostics-${stamp}.json`;
  const absPath = path.join(dir, fileName);
  let relPath = path.relative(root, absPath).split(path.sep).join("/");
  if (!relPath || relPath.startsWith("..") || path.isAbsolute(relPath)) {
    // Never persist host temp absolute/relative escape paths into evidence.
    relPath = `docs/migration-remediation/${fileName}`;
  }

  if (!diagnostics || !diagnostics.artifact) {
    return {
      ok: false,
      complete: false,
      reason: INCOMPLETE_REASON,
      failures: [{ rule: "diagnostics_artifact_missing" }],
      persistedPath: null,
      absolutePath: null,
    };
  }

  const artifact = {
    ...diagnostics.artifact,
    complete: diagnostics.complete === true,
    persistedRelativePath: relPath,
  };
  const body = JSON.stringify(artifact, null, 2) + "\n";
  fs.writeFileSync(absPath, body, "utf8");

  let roundTripOk = false;
  try {
    const readBack = JSON.parse(fs.readFileSync(absPath, "utf8"));
    roundTripOk =
      readBack &&
      readBack.kind === KIND &&
      Array.isArray(readBack.tests) &&
      readBack.tests.length === (artifact.counts?.expected || EXPECTED_PR312_TEST_TITLES.length);
  } catch {
    roundTripOk = false;
  }

  const complete = diagnostics.complete === true && roundTripOk;
  const failures = [];
  if (!roundTripOk) failures.push({ rule: "diagnostics_persist_roundtrip_failed" });
  if (diagnostics.complete !== true) {
    failures.push({
      rule: INCOMPLETE_REASON,
      incompleteReasons: diagnostics.incompleteReasons || [],
    });
  }

  return {
    ok: complete,
    complete,
    reason: complete
      ? null
      : diagnostics.vitestFailed
        ? INCOMPLETE_REASON
        : failures[0]?.rule || "diagnostics_persist_failed",
    failures,
    persistedPath: relPath,
    absolutePath: absPath,
    contentSha256: sha256Text(body),
    artifact,
  };
}

/**
 * Full lifecycle helper: build → persist (when vitest failed or force) → delete raw report.
 * Detached worktree cleanup remains the caller's responsibility after this returns.
 */
function captureVitestDiagnosticsBeforeCleanup(input = {}) {
  const built = buildSanitizedVitestFailureDiagnostics(input);
  const shouldPersist =
    input.forcePersist === true || built.vitestFailed === true;

  let persisted = null;
  if (shouldPersist) {
    persisted = persistSanitizedVitestDiagnosticsArtifact(built, {
      repoRoot: input.repoRoot,
      evidenceDir: input.evidenceDir,
      stamp: input.stamp,
      fileName: input.fileName,
    });
  }

  let rawReportDeleted = false;
  if (input.rawReportPath) {
    try {
      if (fs.existsSync(input.rawReportPath)) {
        fs.unlinkSync(input.rawReportPath);
      }
      rawReportDeleted = !fs.existsSync(input.rawReportPath);
    } catch {
      rawReportDeleted = false;
    }
  } else {
    rawReportDeleted = true;
  }

  const vitestFailed = built.vitestFailed;
  let complete = built.complete === true && rawReportDeleted;
  if (shouldPersist) {
    complete = complete && persisted?.complete === true;
  }

  const reason =
    vitestFailed && !complete
      ? INCOMPLETE_REASON
      : complete
        ? null
        : built.reason || persisted?.reason || "diagnostics_capture_failed";

  return {
    ok: complete,
    complete,
    reason,
    vitestFailed,
    built,
    persisted,
    rawReportDeleted,
    diagnosticsPath: persisted?.persistedPath || null,
  };
}

/**
 * Merge gate outcome with diagnostics fail-closed rule.
 * Never upgrades a failing gate to PASS. On Vitest failure with incomplete
 * diagnostics, reason becomes vitest_failure_diagnostics_incomplete.
 */
function applyDiagnosticsFailClosed(gate, capture) {
  const base = gate && typeof gate === "object" ? { ...gate } : { ok: false, reason: "vitest_gate_absent", failures: [] };
  const failures = Array.isArray(base.failures) ? base.failures.slice() : [];
  const diagnosticsSummary = {
    complete: capture?.complete === true,
    reason: capture?.reason || null,
    path: capture?.diagnosticsPath || null,
    rawReportDeleted: capture?.rawReportDeleted === true,
    incompleteReasons: capture?.built?.incompleteReasons || [],
  };

  if (base.ok === true) {
    // PASS only if diagnostics (when required) did not fail closed.
    if (capture && capture.vitestFailed) {
      // Inconsistent: gate pass but vitestFailed — fail closed.
      failures.unshift({ rule: INCOMPLETE_REASON, detail: "gate_pass_inconsistent_with_vitest_failed" });
      return {
        ...base,
        ok: false,
        status: "FAIL",
        reason: INCOMPLETE_REASON,
        failures,
        diagnostics: diagnosticsSummary,
      };
    }
    return {
      ...base,
      diagnostics: diagnosticsSummary,
    };
  }

  if (capture && capture.vitestFailed && capture.complete !== true) {
    failures.unshift({
      rule: INCOMPLETE_REASON,
      incompleteReasons: capture.built?.incompleteReasons || [],
      rawReportDeleted: capture.rawReportDeleted,
    });
    return {
      ...base,
      ok: false,
      status: "FAIL",
      reason: INCOMPLETE_REASON,
      failures,
      diagnostics: diagnosticsSummary,
    };
  }

  return {
    ...base,
    ok: false,
    status: "FAIL",
    diagnostics: diagnosticsSummary,
  };
}

module.exports = {
  SCHEMA_VERSION,
  KIND,
  INCOMPLETE_REASON,
  REDACTION_MARKERS,
  DEFAULT_MAX_MESSAGE_CHARS,
  DEFAULT_MAX_STACK_FRAMES,
  sanitizeDiagnosticText,
  extractSqlSignals,
  sanitizeStackFrames,
  buildSanitizedVitestFailureDiagnostics,
  persistSanitizedVitestDiagnosticsArtifact,
  captureVitestDiagnosticsBeforeCleanup,
  applyDiagnosticsFailClosed,
};
