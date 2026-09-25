"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const {
  validateCorrectivePreconditionEvidence,
  DISPOSABLE_VALIDATOR,
} = require("./ra-pro-accounting-automation-corrective-precondition-gates");
const {
  validateCorrectivePreApplyLiveEvidence,
  DISPOSABLE_VALIDATOR: DISPOSABLE_PRE_APPLY_VALIDATOR,
} = require("./ra-pro-accounting-automation-corrective-pre-apply-gates");
const {
  assertCollectionAuthorityBeforeObservation,
  expectedAuthorityFromMap,
  BLOCKED_UNPUBLISHED,
} = require("./ra-pro-accounting-automation-corrective-collection-authorization");

const WINDOW_MS = 24 * 60 * 60 * 1000;
const HEX40 = /^[0-9a-f]{40}$/;

function sha256Buffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function isoUtc(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function assertObservationSafe(value, label) {
  const text = JSON.stringify(value);
  if (/postgres(?:ql)?:\/\//i.test(text)) {
    throw new Error(`${label}: database URL forbidden in observations`);
  }
  if (/sk_[a-z]+_/i.test(text) || text.includes("BEGIN CERTIFICATE") || text.includes("BEGIN RSA")) {
    throw new Error(`${label}: credential material forbidden in observations`);
  }
}

function mergeIndependentlyObserved(observations = {}) {
  const observed = observations.independently_observed || observations;
  assertObservationSafe(observed, "independently_observed");
  return observed;
}

function buildAttestations(meta = {}, observations = {}) {
  // Do not stamp tooling_reviewed_tip as authority. Free-form collection_tooling_tip
  // may exist in observation attestations but is non-authoritative and ignored by gates.
  const attestations = {
    ...(observations.attestations || {}),
    ...(meta.attestations || {}),
    collection_scope: meta.collection_scope || observations.collection_scope || null,
    operator_note: meta.operator_note || null,
  };
  delete attestations.tooling_reviewed_tip;
  assertObservationSafe(attestations, "attestations");
  return attestations;
}

function buildWindow(now = new Date()) {
  const start = now instanceof Date ? now : new Date(now);
  const end = new Date(start.getTime() + WINDOW_MS);
  return {
    valid_from_utc: isoUtc(start),
    valid_until_utc: isoUtc(end),
    collected_at_utc: isoUtc(start),
    collection_started_at_utc: isoUtc(start),
    collection_ended_at_utc: isoUtc(new Date(start.getTime() + 60_000)),
  };
}

function requireAuthorityFields(authority, label) {
  if (
    !authority ||
    !HEX40.test(String(authority.authorized_executable_commit || "").toLowerCase()) ||
    !HEX40.test(String(authority.authorization_publication_commit || "").toLowerCase()) ||
    !HEX40.test(String(authority.authorization_publication_blob_oid || "").toLowerCase())
  ) {
    const error = new Error(
      `${label}: meta.authority requires authorized_executable_commit, authorization_publication_commit, authorization_publication_blob_oid`,
    );
    error.code = "COLLECTOR_AUTHORITY_REQUIRED";
    throw error;
  }
  return {
    authorized_executable_commit: String(authority.authorized_executable_commit).toLowerCase(),
    authorization_publication_commit: String(authority.authorization_publication_commit).toLowerCase(),
    authorization_publication_blob_oid: String(authority.authorization_publication_blob_oid).toLowerCase(),
  };
}

/**
 * Resolve collection authority before observation/emit.
 * meta.authority (verified map) skips runtime publication lookup.
 * fresh_read_only_supabase_select / production channels require published collection auth.
 */
function resolveCollectionAuthority(meta = {}, observations = {}) {
  const channel =
    meta.source_channel_classification ||
    observations.source_channel_classification ||
    "synthetic_disposable_fixture";

  if (meta.authority) {
    return requireAuthorityFields(meta.authority, "COLLECTOR_AUTHORITY_REQUIRED");
  }

  if (channel === "synthetic_disposable_fixture") {
    const error = new Error(
      "COLLECTOR_AUTHORITY_REQUIRED: meta.authority with three fields required for synthetic_disposable_fixture",
    );
    error.code = "COLLECTOR_AUTHORITY_REQUIRED";
    throw error;
  }

  // Production observation path: fail closed before any production contact.
  const map = assertCollectionAuthorityBeforeObservation({
    cwd: meta.cwd,
    publicationCommit: meta.publicationCommit,
    env: meta.env,
    auth: meta.auth,
  });
  if (map.blocked || map.collection_authorized !== true) {
    const error = new Error(`${BLOCKED_UNPUBLISHED}: collection unauthorized`);
    error.code = BLOCKED_UNPUBLISHED;
    throw error;
  }
  return expectedAuthorityFromMap(map);
}

function assertAuthorityGate(meta = {}, observations = {}) {
  return resolveCollectionAuthority(meta, observations);
}

function buildCorrectivePreconditionEvidence(observations = {}, meta = {}) {
  if (observations.productionContact === true || observations.production_writes > 0) {
    throw new Error("COLLECTOR_REFUSED: production write observations forbidden");
  }
  const authority = assertAuthorityGate(meta, observations);
  const observed = mergeIndependentlyObserved(observations);
  if (!observed.database_readonly?.privilege_surfaces || !observed.database_readonly?.objects) {
    throw new Error("COLLECTOR_OBSERVATION_INCOMPLETE: privilege_surfaces and objects required");
  }
  if (!observed.automation_gate) {
    throw new Error("COLLECTOR_OBSERVATION_INCOMPLETE: authoritative automation_gate required");
  }
  const window = buildWindow(meta.now || observations.now || new Date("2026-09-21T10:00:00Z"));
  const evidence = {
    protocol: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1",
    schema_version: 3,
    source_channel_classification:
      meta.source_channel_classification || observations.source_channel_classification || "synthetic_disposable_fixture",
    collected_at_utc: window.collected_at_utc,
    valid_from_utc: window.valid_from_utc,
    valid_until_utc: window.valid_until_utc,
    authorization: {
      pr_number: 324,
      scope: "read_only_production_corrective_precondition_collection",
      authorized_executable_commit: authority.authorized_executable_commit,
      authorization_publication_commit: authority.authorization_publication_commit,
      authorization_publication_blob_oid: authority.authorization_publication_blob_oid,
    },
    automation_gate: observed.automation_gate,
    database_readonly: observed.database_readonly,
    safety: observed.safety || {
      read_only: true,
      select_only: true,
      production_writes: 0,
      sql_application_attempts: 0,
      dry_run_attempts: 0,
      migration_apply_attempts: 0,
      provider_writes: 0,
      automation_enabled: false,
      merge_or_deploy_performed: false,
      credential_prompt_opened: false,
      marker_created: false,
      pins_published: false,
    },
    visibility_limitations: observed.visibility_limitations || meta.visibility_limitations || [
      "Corrective precondition evidence pins remain UNPUBLISHED. This artifact does not authorize dry-run or apply.",
    ],
    validator_result: DISPOSABLE_VALIDATOR,
    independently_observed: observed,
    attestations: buildAttestations(meta, observations),
  };
  return evidence;
}

function buildCorrectivePreApplyLiveEvidence(observations = {}, meta = {}) {
  if (observations.productionContact === true || observations.production_writes > 0) {
    throw new Error("COLLECTOR_REFUSED: production write observations forbidden");
  }
  const authority = assertAuthorityGate(meta, observations);
  const observed = mergeIndependentlyObserved(observations);
  if (!observed.database_readonly?.privilege_surfaces || !observed.database_readonly?.objects) {
    throw new Error("COLLECTOR_OBSERVATION_INCOMPLETE: privilege_surfaces and objects required");
  }
  if (!observed.automation_gate) {
    throw new Error("COLLECTOR_OBSERVATION_INCOMPLETE: authoritative automation_gate required");
  }
  const window = buildWindow(meta.now || observations.now || new Date("2026-09-21T10:00:00Z"));
  const evidence = {
    protocol: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1",
    schema_version: 3,
    source_channel_classification:
      meta.source_channel_classification || observations.source_channel_classification || "synthetic_disposable_fixture",
    collection_started_at_utc: window.collection_started_at_utc,
    collection_ended_at_utc: window.collection_ended_at_utc,
    valid_from_utc: window.valid_from_utc,
    valid_until_utc: window.valid_until_utc,
    authorization: {
      pr_number: 324,
      scope: "read_only_production_corrective_pre_apply_live_collection",
      authorized_executable_commit: authority.authorized_executable_commit,
      authorization_publication_commit: authority.authorization_publication_commit,
      authorization_publication_blob_oid: authority.authorization_publication_blob_oid,
      committed_pre_apply_pins: "UNPUBLISHED",
      disposable_pin_scope: "in_memory_file_sha_only",
    },
    automation_gate: observed.automation_gate,
    database_readonly: observed.database_readonly,
    safety: observed.safety || {
      read_only: true,
      select_only: true,
      production_writes: 0,
      sql_application_attempts: 0,
      dry_run_attempts: 0,
      migration_apply_attempts: 0,
      provider_writes: 0,
      automation_enabled: false,
      merge_or_deploy_performed: false,
      credential_prompt_opened: false,
      marker_created: false,
      pins_published: false,
    },
    visibility_limitations: observed.visibility_limitations || meta.visibility_limitations || [
      "Corrective pre-apply live evidence pins remain UNPUBLISHED. Apply remains unreachable.",
    ],
    validator_result: DISPOSABLE_PRE_APPLY_VALIDATOR,
    independently_observed: observed,
    attestations: buildAttestations(meta, observations),
  };
  return evidence;
}

function serializeLfJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function emitCorrectiveEvidenceArtifact({
  kind,
  observations = {},
  expectedPins = {},
  meta = {},
  outPath,
  allowWrite = false,
  now,
} = {}) {
  try {
    if (allowWrite !== true) {
      return { ok: false, error: "COLLECTOR_WRITE_FORBIDDEN: allowWrite!==true" };
    }
    if (!outPath) {
      return { ok: false, error: "COLLECTOR_WRITE_FORBIDDEN: outPath required" };
    }
    // Fail closed before any write when production collection authority is unpublished.
    const authority = assertAuthorityGate(meta, observations);
    const gatedMeta = { ...meta, authority };

    const build =
      kind === "precondition"
        ? buildCorrectivePreconditionEvidence
        : kind === "pre_apply_live"
          ? buildCorrectivePreApplyLiveEvidence
          : null;
    if (!build) {
      return { ok: false, error: "COLLECTOR_KIND_INVALID" };
    }
    const evidence = build(observations, gatedMeta);
    const validate =
      kind === "precondition"
        ? validateCorrectivePreconditionEvidence
        : validateCorrectivePreApplyLiveEvidence;
    const gateNow = now || meta.gateNow || evidence.valid_from_utc;
    const expected = {
      authorized_executable_commit:
        expectedPins.authorized_executable_commit || authority.authorized_executable_commit,
      authorization_publication_commit:
        expectedPins.authorization_publication_commit || authority.authorization_publication_commit,
      authorization_publication_blob_oid:
        expectedPins.authorization_publication_blob_oid || authority.authorization_publication_blob_oid,
    };
    validate(evidence, { now: gateNow, expected });
    const text = serializeLfJson(evidence);
    const buffer = Buffer.from(text, "utf8");
    if (buffer.includes(0x0d)) {
      return { ok: false, error: "COLLECTOR_NEWLINE_INVALID: CR forbidden" };
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buffer);
    const sha256 = sha256Buffer(buffer);
    const oid = execFileSync("git", ["hash-object", "--stdin"], {
      input: buffer,
      encoding: "utf8",
    }).trim();
    validate(JSON.parse(fs.readFileSync(outPath, "utf8")), {
      now: gateNow,
      expected,
    });
    return { ok: true, sha256, bytes: buffer.length, oid, path: outPath };
  } catch (err) {
    return { ok: false, error: err.code || err.message || String(err) };
  }
}

module.exports = {
  buildCorrectivePreconditionEvidence,
  buildCorrectivePreApplyLiveEvidence,
  emitCorrectiveEvidenceArtifact,
  serializeLfJson,
  resolveCollectionAuthority,
};
