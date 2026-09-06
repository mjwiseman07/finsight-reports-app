#!/usr/bin/env node
/**
 * Static / runtime-definition analyzer for publish_ledger_event pgcrypto digest
 * qualification. Distinguishes exact unqualified digest( calls from the
 * substring inside extensions.digest(.
 *
 * NOT a Docker/SQL harness — callers supply function body text (migration SQL
 * or pg_get_functiondef output) and optional proconfig.
 */
"use strict";

/**
 * Strip schema-qualified digest invocations so leftover matches are true
 * unqualified calls. Replacing with a sentinel that still contains "digest"
 * (e.g. EXT_DIGEST) is forbidden — that false-matches under /digest/i.
 *
 * @param {string} body
 */
function stripQualifiedDigestCalls(body) {
  return String(body || "").replace(/extensions\.digest\s*\(/gi, "");
}

/**
 * True when body still contains an unqualified digest( after qualified calls
 * are removed.
 * @param {string} body
 */
function hasUnqualifiedDigestCall(body) {
  return /\bdigest\s*\(/i.test(stripQualifiedDigestCalls(body));
}

/**
 * @param {string} body
 * @param {string[]|null|undefined} [proconfig]
 */
function analyzePublishLedgerEventDigestDefinition(body, proconfig) {
  const text = String(body || "");
  const hasExtensionsDigest = /extensions\.digest\s*\(/i.test(text);
  const hasTypedSha256 = /'sha256'\s*::\s*text/i.test(text);
  const unqualified = hasUnqualifiedDigestCall(text);
  const searchPathPinned =
    Array.isArray(proconfig) &&
    proconfig.some((c) => String(c) === "search_path=public, pg_temp");
  const setSearchPathInDef =
    /SET\s+search_path\s*(?:=|TO)\s*'?public'?\s*,\s*'?pg_temp'?/i.test(text);
  const ok =
    hasExtensionsDigest &&
    hasTypedSha256 &&
    !unqualified &&
    (searchPathPinned || setSearchPathInDef);
  return {
    ok,
    hasExtensionsDigest,
    hasTypedSha256,
    hasUnqualifiedDigest: unqualified,
    searchPathPinned: Boolean(searchPathPinned),
    setSearchPathInDef: Boolean(setSearchPathInDef),
  };
}

module.exports = {
  stripQualifiedDigestCalls,
  hasUnqualifiedDigestCall,
  analyzePublishLedgerEventDigestDefinition,
};
