import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const preconditionGates = require("../../scripts/security/ra-pro-accounting-automation-corrective-precondition-gates");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const preApplyGates = require("../../scripts/security/ra-pro-accounting-automation-corrective-pre-apply-gates");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const collector = require("../../scripts/security/ra-pro-accounting-automation-corrective-evidence-collector");

const ROOT = process.cwd();
const PRECONDITION_FIXTURE =
  "tests/security/helpers/fixtures/ra-pro-accounting-automation-corrective-precondition-synthetic.json";
const PRE_APPLY_FIXTURE =
  "tests/security/helpers/fixtures/ra-pro-accounting-automation-corrective-pre-apply-live-synthetic.json";
const AUTH_PATH = "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json";
const NOW = "2026-09-21T12:00:00Z";

type MutableEvidence = Record<string, unknown>;

function loadJson(rel: string) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as MutableEvidence;
}

function codeOf(err: unknown) {
  return String((err as { code?: string; message?: string }).code || (err as Error).message || "");
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
    throw new Error(`expected ${code}`);
  } catch (err) {
    expect(codeOf(err)).toMatch(new RegExp(code));
  }
}

function cloneFixture(rel: string) {
  return structuredClone(loadJson(rel));
}

function pg17PrivilegeDefect(base: MutableEvidence) {
  const db = base.database_readonly as MutableEvidence;
  const defect = db.privilege_defect as MutableEvidence;
  db.server_version_num = 170000;
  defect.maintain_supported = true;
  defect.maintain_status = "checked";
  for (const role of ["service_role", "authenticated", "anon"]) {
    (defect[role] as MutableEvidence).MAINTAIN = false;
  }
}

describe("RA Pro accounting-automation corrective evidence gates", () => {
  it("accepts valid precondition and pre-apply synthetic fixtures", () => {
    const precondition = loadJson(PRECONDITION_FIXTURE);
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(precondition, { now: NOW }),
    ).toMatchObject({ protocol: preconditionGates.PROTOCOL, apply_authorized: false });

    const preApply = loadJson(PRE_APPLY_FIXTURE);
    expect(preApplyGates.validateCorrectivePreApplyLiveEvidence(preApply, { now: NOW })).toMatchObject({
      protocol: preApplyGates.PROTOCOL,
      apply_authorized: false,
    });
  });

  it.each([
    ["history 189", (e: MutableEvidence) => ((e.database_readonly as MutableEvidence).history_count = 189)],
    ["history 191", (e: MutableEvidence) => ((e.database_readonly as MutableEvidence).history_count = 191)],
  ])("rejects precondition %s", (_name, mutate) => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    mutate(evidence);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(evidence, { now: NOW }),
      "CORRECTIVE_PRECONDITION_HISTORY",
    );
  });

  it("rejects missing or duplicate originals", () => {
    const missing = cloneFixture(PRECONDITION_FIXTURE);
    (missing.database_readonly as MutableEvidence).original_committed_migrations = [
      ((missing.database_readonly as MutableEvidence).original_committed_migrations as MutableEvidence[])[0],
    ];
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(missing, { now: NOW }),
      "CORRECTIVE_PRECONDITION_ORIGINALS",
    );

    const duplicate = cloneFixture(PRECONDITION_FIXTURE);
    const originals = (duplicate.database_readonly as MutableEvidence)
      .original_committed_migrations as MutableEvidence[];
    originals[0].count = 2;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(duplicate, { now: NOW }),
      "CORRECTIVE_PRECONDITION_ORIGINALS",
    );
  });

  it("rejects corrective version present", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    (evidence.database_readonly as MutableEvidence).corrective_version_count = 1;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(evidence, { now: NOW }),
      "CORRECTIVE_PRECONDITION_CORRECTIVE",
    );
  });

  it.each([
    ["absent defect", (e: MutableEvidence) => (((e.database_readonly as MutableEvidence).privilege_defect as MutableEvidence).present = false)],
    [
      "broader service_role",
      (e: MutableEvidence) => (((e.database_readonly as MutableEvidence).privilege_defect as MutableEvidence).service_role as MutableEvidence).UPDATE = false,
    ],
    [
      "authenticated insert",
      (e: MutableEvidence) => (((e.database_readonly as MutableEvidence).privilege_defect as MutableEvidence).authenticated as MutableEvidence).INSERT = true,
    ],
  ])("rejects privilege defect %s", (_name, mutate) => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    mutate(evidence);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(evidence, { now: NOW }),
      "CORRECTIVE_PRECONDITION_PRIVILEGE",
    );
  });

  it("rejects PUBLIC catalog and inherited differences", () => {
    const pub = cloneFixture(PRECONDITION_FIXTURE);
    (((pub.database_readonly as MutableEvidence).privilege_defect as MutableEvidence).PUBLIC_catalog_empty = false);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(pub, { now: NOW }),
      "CORRECTIVE_PRECONDITION_PRIVILEGE_PUBLIC",
    );

    const exec = cloneFixture(PRECONDITION_FIXTURE);
    (((exec.database_readonly as MutableEvidence).privilege_defect as MutableEvidence).EXECUTE as MutableEvidence).authenticated = true;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(exec, { now: NOW }),
      "CORRECTIVE_PRECONDITION_PRIVILEGE_EXECUTE",
    );
  });

  it("enforces PG16 vs PG17 maintain semantics", () => {
    const pg16 = cloneFixture(PRECONDITION_FIXTURE);
    expect(() =>
      preconditionGates.validateCorrectivePreconditionEvidence(pg16, { now: NOW }),
    ).not.toThrow();

    const pg17 = cloneFixture(PRECONDITION_FIXTURE);
    pg17PrivilegeDefect(pg17);
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(pg17, { now: NOW }).protocol,
    ).toBe(preconditionGates.PROTOCOL);

    const badPg17 = cloneFixture(PRECONDITION_FIXTURE);
    pg17PrivilegeDefect(badPg17);
    (((badPg17.database_readonly as MutableEvidence).privilege_defect as MutableEvidence).service_role as MutableEvidence).MAINTAIN = true;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(badPg17, { now: NOW }),
      "CORRECTIVE_PRECONDITION_PRIVILEGE_MAINTAIN",
    );

    const badPg16 = cloneFixture(PRECONDITION_FIXTURE);
    (((badPg16.database_readonly as MutableEvidence).privilege_defect as MutableEvidence).service_role as MutableEvidence).MAINTAIN = false;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(badPg16, { now: NOW }),
      "CORRECTIVE_PRECONDITION_PRIVILEGE_MAINTAIN",
    );
  });

  it("rejects object, RLS, policy, and EXECUTE drift", () => {
    const tables = cloneFixture(PRECONDITION_FIXTURE);
    (tables.database_readonly as MutableEvidence).tables_present = false;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(tables, { now: NOW }),
      "CORRECTIVE_PRECONDITION_OBJECT",
    );

    const policies = cloneFixture(PRECONDITION_FIXTURE);
    (policies.database_readonly as MutableEvidence).policies_present = false;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(policies, { now: NOW }),
      "CORRECTIVE_PRECONDITION_OBJECT",
    );
  });

  it("rejects automation enabled and nonterminal webhooks", () => {
    const automation = cloneFixture(PRECONDITION_FIXTURE);
    (automation.safety as MutableEvidence).automation_enabled = true;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(automation, { now: NOW }),
      "CORRECTIVE_PRECONDITION_SAFETY",
    );

    const gate = cloneFixture(PRECONDITION_FIXTURE);
    (gate.automation_gate as MutableEvidence).effective_state = "open";
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(gate, { now: NOW }),
      "CORRECTIVE_PRECONDITION_AUTOMATION_GATE",
    );

    const webhook = cloneFixture(PRECONDITION_FIXTURE);
    (webhook.database_readonly as MutableEvidence).webhook_non_terminal_count = 1;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(webhook, { now: NOW }),
      "CORRECTIVE_PRECONDITION_WEBHOOK",
    );
  });

  it("rejects nonzero write counters", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    (evidence.safety as MutableEvidence).production_writes = 1;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(evidence, { now: NOW }),
      "CORRECTIVE_PRECONDITION_WRITE_COUNTER",
    );
  });

  it("rejects dual-protocol substitution", () => {
    for (const protocol of [
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
    ]) {
      const sub = cloneFixture(PRECONDITION_FIXTURE);
      sub.protocol = protocol;
      expectCode(
        () => preconditionGates.validateCorrectivePreconditionEvidence(sub, { now: NOW }),
        "CORRECTIVE_PRECONDITION_SUBSTITUTION_FORBIDDEN",
      );
    }

    const preSub = cloneFixture(PRE_APPLY_FIXTURE);
    preSub.protocol = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1";
    expectCode(
      () => preApplyGates.validateCorrectivePreApplyLiveEvidence(preSub, { now: NOW }),
      "CORRECTIVE_PRE_APPLY_SUBSTITUTION_FORBIDDEN",
    );
  });

  it("rejects future, expired, newline tamper, and sanitization failures", () => {
    const future = cloneFixture(PRECONDITION_FIXTURE);
    future.valid_from_utc = "2026-09-22T10:00:00Z";
    future.valid_until_utc = "2026-09-23T10:00:00Z";
    future.collected_at_utc = "2026-09-22T10:00:00Z";
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(future, { now: NOW }),
      "CORRECTIVE_PRECONDITION_NOT_YET_VALID",
    );

    const expired = cloneFixture(PRECONDITION_FIXTURE);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(expired, { now: "2026-09-22T10:00:00Z" }),
      "CORRECTIVE_PRECONDITION_EXPIRED",
    );

    const tamper = cloneFixture(PRECONDITION_FIXTURE);
    tamper.visibility_limitations = [
      "Corrective precondition evidence pins remain UNPUBLISHED.",
      "postgres://user:pass@host/db",
    ];
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(tamper, { now: NOW }),
      "CORRECTIVE_PRECONDITION_SANITIZATION",
    );

    const buffer = Buffer.from(`${JSON.stringify(loadJson(PRECONDITION_FIXTURE))}\n\n`, "utf8");
    expectCode(() => preconditionGates.assertTrailingLf(buffer), "CORRECTIVE_PRECONDITION_NEWLINE");
  });

  it("assertPublished throws before needing evidence file when pins are UNPUBLISHED", () => {
    const auth = JSON.parse(fs.readFileSync(path.join(ROOT, AUTH_PATH), "utf8"));
    expectCode(
      () => preconditionGates.assertCorrectivePreconditionEvidencePublished({ auth, cwd: ROOT }),
      "CORRECTIVE_PRECONDITION_PINS_UNPUBLISHED",
    );
    expectCode(
      () => preApplyGates.assertCorrectivePreApplyLiveEvidencePublished({ auth, cwd: ROOT }),
      "CORRECTIVE_PRE_APPLY_PINS_UNPUBLISHED",
    );
  });

  it("collector refuses write when invalid and writes LF artifact when valid", () => {
    const invalid = collector.emitCorrectiveEvidenceArtifact({
      kind: "precondition",
      observations: { independently_observed: { database_readonly: {} } },
      allowWrite: true,
      outPath: path.join(os.tmpdir(), "corrective-evidence-invalid.json"),
    });
    expect(invalid.ok).toBe(false);

    const refused = collector.emitCorrectiveEvidenceArtifact({
      kind: "precondition",
      observations: { independently_observed: loadJson(PRECONDITION_FIXTURE).database_readonly },
      allowWrite: false,
      outPath: path.join(os.tmpdir(), "corrective-evidence-refused.json"),
    });
    expect(refused.ok).toBe(false);
    expect(String(refused.error)).toMatch(/allowWrite/);

    const tmp = path.join(os.tmpdir(), `corrective-precondition-${crypto.randomBytes(4).toString("hex")}.json`);
    const fixture = loadJson(PRECONDITION_FIXTURE);
    const observations = {
      independently_observed: {
        database_readonly: fixture.database_readonly,
        automation_gate: fixture.automation_gate,
        safety: fixture.safety,
        visibility_limitations: fixture.visibility_limitations,
      },
    };
    const written = collector.emitCorrectiveEvidenceArtifact({
      kind: "precondition",
      observations,
      meta: { now: new Date("2026-09-21T10:00:00Z") },
      allowWrite: true,
      outPath: tmp,
      now: "2026-09-21T12:00:00Z",
    });
    expect(written.ok).toBe(true);
    const buffer = fs.readFileSync(tmp);
    expect(buffer.includes(0x0d)).toBe(false);
    expect(buffer[buffer.length - 1]).toBe(0x0a);
    expect(buffer[buffer.length - 2]).not.toBe(0x0a);
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(JSON.parse(buffer.toString("utf8")), { now: NOW }),
    ).toBeTruthy();
    fs.unlinkSync(tmp);
  });
});
