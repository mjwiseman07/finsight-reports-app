"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const {
  validateCorrectivePreconditionEvidence,
  DISPOSABLE_VALIDATOR,
  COLLECTION_PR_HEAD,
  TOOLING_REVIEWED_TIP,
} = require("./ra-pro-accounting-automation-corrective-precondition-gates");
const {
  validateCorrectivePreApplyLiveEvidence,
  DISPOSABLE_VALIDATOR: DISPOSABLE_PRE_APPLY_VALIDATOR,
} = require("./ra-pro-accounting-automation-corrective-pre-apply-gates");

const WINDOW_MS = 24 * 60 * 60 * 1000;

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
  const attestations = {
    ...(observations.attestations || {}),
    ...(meta.attestations || {}),
    collection_scope: meta.collection_scope || observations.collection_scope || null,
    tooling_reviewed_tip: meta.tooling_reviewed_tip || TOOLING_REVIEWED_TIP,
    operator_note: meta.operator_note || null,
  };
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

function buildCorrectivePreconditionEvidence(observations = {}, meta = {}) {
  if (observations.productionContact === true || observations.production_writes > 0) {
    throw new Error("COLLECTOR_REFUSED: production write observations forbidden");
  }
  const observed = mergeIndependentlyObserved(observations);
  if (!observed.database_readonly?.privilege_surfaces || !observed.database_readonly?.objects) {
    throw new Error("COLLECTOR_OBSERVATION_INCOMPLETE: privilege_surfaces and objects required");
  }
  const window = buildWindow(meta.now || observations.now || new Date("2026-09-21T10:00:00Z"));
  const evidence = {
    protocol: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1",
    schema_version: 2,
    source_channel_classification:
      meta.source_channel_classification || observations.source_channel_classification || "synthetic_disposable_fixture",
    collected_at_utc: window.collected_at_utc,
    valid_from_utc: window.valid_from_utc,
    valid_until_utc: window.valid_until_utc,
    authorization: {
      pr_number: 324,
      pr_head: meta.pr_head || observed.pr_head || COLLECTION_PR_HEAD,
      scope: "read_only_production_corrective_precondition_collection",
      tooling_reviewed_tip: meta.tooling_reviewed_tip || TOOLING_REVIEWED_TIP,
    },
    automation_gate: observed.automation_gate || {
      key: "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION",
      production_presence: "absent",
      effective_state: "closed",
      value_read: false,
    },
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
  const observed = mergeIndependentlyObserved(observations);
  if (!observed.database_readonly?.privilege_surfaces || !observed.database_readonly?.objects) {
    throw new Error("COLLECTOR_OBSERVATION_INCOMPLETE: privilege_surfaces and objects required");
  }
  const window = buildWindow(meta.now || observations.now || new Date("2026-09-21T10:00:00Z"));
  const evidence = {
    protocol: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1",
    schema_version: 2,
    source_channel_classification:
      meta.source_channel_classification || observations.source_channel_classification || "synthetic_disposable_fixture",
    collection_started_at_utc: window.collection_started_at_utc,
    collection_ended_at_utc: window.collection_ended_at_utc,
    valid_from_utc: window.valid_from_utc,
    valid_until_utc: window.valid_until_utc,
    authorization: {
      pr_number: 324,
      pr_head: meta.pr_head || observed.pr_head || COLLECTION_PR_HEAD,
      scope: "read_only_production_corrective_pre_apply_live_collection",
      tooling_reviewed_tip: meta.tooling_reviewed_tip || TOOLING_REVIEWED_TIP,
      committed_pre_apply_pins: "UNPUBLISHED",
      disposable_pin_scope: "in_memory_file_sha_only",
    },
    automation_gate: observed.automation_gate || {
      key: "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION",
      production_presence: "absent",
      effective_state: "closed",
      value_read: false,
    },
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
    const build =
      kind === "precondition"
        ? buildCorrectivePreconditionEvidence
        : kind === "pre_apply_live"
          ? buildCorrectivePreApplyLiveEvidence
          : null;
    if (!build) {
      return { ok: false, error: "COLLECTOR_KIND_INVALID" };
    }
    const evidence = build(observations, meta);
    const validate =
      kind === "precondition"
        ? validateCorrectivePreconditionEvidence
        : validateCorrectivePreApplyLiveEvidence;
    const gateNow = now || meta.gateNow || evidence.valid_from_utc;
    validate(evidence, { now: gateNow, expected: expectedPins });
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
      expected: expectedPins,
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
};
