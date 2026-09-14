/**
 * TLS trust root wrapper for Free Review lead-session applicator.
 * Rejects retired CA-path env channels from this package and containment sibling.
 */
"use strict";

const {
  FORBIDDEN_SSL_ROOTCERT_ENV,
  FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV,
} = require("./free-review-lead-session-apply-constants");
const containmentTls = require("./containment-tls-ca");

function tlsPolicyError(code, message) {
  const e = new Error(message);
  e.code = code;
  e.phase = "tls_policy";
  return e;
}

function assertNoForbiddenCaPathChannels(env = process.env) {
  for (const name of [
    FORBIDDEN_SSL_ROOTCERT_ENV,
    "CONTAINMENT_APPLY_SSL_ROOTCERT",
  ]) {
    const raw = env[name];
    if (raw != null && String(raw).length > 0) {
      throw tlsPolicyError(
        "BLOCKED_TLS_CA_PATH_FORBIDDEN",
        `BLOCKED_TLS_CA_PATH_FORBIDDEN: ${name} is retired; trust root is embedded`,
      );
    }
  }
}

function buildPgClientOptions(databaseUrl, env = process.env, opts = {}) {
  assertNoForbiddenCaPathChannels(env);
  if (
    Object.prototype.hasOwnProperty.call(env, FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV) &&
    env[FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV]
  ) {
    throw tlsPolicyError(
      "PROHIBITED_CREDENTIAL_CHANNEL",
      `PROHIBITED_CREDENTIAL_CHANNEL: ${FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV} is forbidden for FRLS applicator`,
    );
  }
  return containmentTls.buildPgClientOptions(databaseUrl, env, opts);
}

module.exports = {
  ...containmentTls,
  FORBIDDEN_SSL_ROOTCERT_ENV,
  assertNoForbiddenCaPathChannels,
  buildPgClientOptions,
};
