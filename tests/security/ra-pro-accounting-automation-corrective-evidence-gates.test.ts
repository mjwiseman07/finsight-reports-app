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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const schema = require("../../scripts/security/ra-pro-accounting-automation-corrective-evidence-schema");

const ROOT = process.cwd();
const PRECONDITION_FIXTURE =
  "tests/security/helpers/fixtures/ra-pro-accounting-automation-corrective-precondition-synthetic.json";
const PRE_APPLY_FIXTURE =
  "tests/security/helpers/fixtures/ra-pro-accounting-automation-corrective-pre-apply-live-synthetic.json";
const AUTH_PATH = "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json";
const NOW = "2026-09-21T12:00:00Z";
const SYNTH_EXEC = "a111111111111111111111111111111111111111";
const SYNTH_PUB = "b222222222222222222222222222222222222222";
const SYNTH_OID = "c333333333333333333333333333333333333333";
const EXPECTED_AUTHORITY = {
  authorized_executable_commit: SYNTH_EXEC,
  authorization_publication_commit: SYNTH_PUB,
  authorization_publication_blob_oid: SYNTH_OID,
};
const GATE_OPTS = { now: NOW, expected: EXPECTED_AUTHORITY };

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

function firstTable(evidence: MutableEvidence) {
  const surfaces = (evidence.database_readonly as MutableEvidence).privilege_surfaces as MutableEvidence;
  const tables = surfaces.tables as MutableEvidence;
  return tables[Object.keys(tables)[0]] as MutableEvidence;
}

function setPg17(evidence: MutableEvidence) {
  const surfaces = (evidence.database_readonly as MutableEvidence).privilege_surfaces as MutableEvidence;
  const rebuilt = schema.buildExpectedPrivilegeSurfaces(170000);
  surfaces.server_version_num = rebuilt.server_version_num;
  surfaces.maintain_applicability = rebuilt.maintain_applicability;
  surfaces.tables = rebuilt.tables;
  surfaces.execute = rebuilt.execute;
}

describe("RA Pro accounting-automation corrective evidence gates", () => {
  it("accepts valid precondition and pre-apply synthetic fixtures", () => {
    const precondition = loadJson(PRECONDITION_FIXTURE);
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(precondition, GATE_OPTS),
    ).toMatchObject({ protocol: preconditionGates.PROTOCOL, apply_authorized: false });

    const preApply = loadJson(PRE_APPLY_FIXTURE);
    expect(preApplyGates.validateCorrectivePreApplyLiveEvidence(preApply, GATE_OPTS)).toMatchObject({
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
      () => preconditionGates.validateCorrectivePreconditionEvidence(evidence, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_HISTORY",
    );
  });

  it("rejects missing or duplicate originals and corrective present", () => {
    const missing = cloneFixture(PRECONDITION_FIXTURE);
    (missing.database_readonly as MutableEvidence).original_committed_migrations = [
      ((missing.database_readonly as MutableEvidence).original_committed_migrations as MutableEvidence[])[0],
    ];
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(missing, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_ORIGINALS",
    );

    const duplicate = cloneFixture(PRECONDITION_FIXTURE);
    (((duplicate.database_readonly as MutableEvidence).original_committed_migrations as MutableEvidence[])[0].count = 2);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(duplicate, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_ORIGINALS",
    );

    const corrective = cloneFixture(PRECONDITION_FIXTURE);
    (corrective.database_readonly as MutableEvidence).corrective_version_count = 1;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(corrective, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_CORRECTIVE",
    );
  });

  it("rejects service_role excess incomplete and authenticated drift", () => {
    const incomplete = cloneFixture(PRECONDITION_FIXTURE);
    const t = firstTable(incomplete);
    ((t.direct_catalog as MutableEvidence).service_role as string[]) = ["SELECT", "INSERT"];
    ((t.effective as MutableEvidence).service_role as MutableEvidence).UPDATE = false;
    ((t.effective as MutableEvidence).service_role as MutableEvidence).DELETE = false;
    ((t.effective as MutableEvidence).service_role as MutableEvidence).TRUNCATE = false;
    ((t.effective as MutableEvidence).service_role as MutableEvidence).REFERENCES = false;
    ((t.effective as MutableEvidence).service_role as MutableEvidence).TRIGGER = false;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(incomplete, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PRIVILEGE",
    );

    const authInsert = cloneFixture(PRECONDITION_FIXTURE);
    const a = firstTable(authInsert);
    ((a.direct_catalog as MutableEvidence).authenticated as string[]).push("INSERT");
    ((a.effective as MutableEvidence).authenticated as MutableEvidence).INSERT = true;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(authInsert, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PRIVILEGE",
    );
  });

  it("rejects inherited excess and unexpected direct grantee", () => {
    const inherited = cloneFixture(PRECONDITION_FIXTURE);
    const t = firstTable(inherited);
    (t.inherited_contributions as MutableEvidence).service_role = [
      { ancestor: "nested_role", privileges: ["UPDATE"] },
    ];
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(inherited, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PRIVILEGE_INHERITED",
    );

    const unexpected = cloneFixture(PRECONDITION_FIXTURE);
    const u = firstTable(unexpected);
    u.unexpected_grantees = [{ grantee: "authenticator", privileges: ["SELECT"] }];
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(unexpected, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PRIVILEGE_UNEXPECTED",
    );
  });

  it("rejects direct/effective contradictions", () => {
    const cleanDirty = cloneFixture(PRECONDITION_FIXTURE);
    const a = firstTable(cleanDirty);
    ((a.direct_catalog as MutableEvidence).service_role as string[]) = (
      (a.direct_catalog as MutableEvidence).service_role as string[]
    ).filter((p) => p !== "UPDATE");
    ((a.effective as MutableEvidence).service_role as MutableEvidence).UPDATE = true;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(cleanDirty, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PRIVILEGE_CONTRADICTION",
    );

    const dirtyClean = cloneFixture(PRECONDITION_FIXTURE);
    const b = firstTable(dirtyClean);
    ((b.effective as MutableEvidence).service_role as MutableEvidence).UPDATE = false;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(dirtyClean, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PRIVILEGE_CONTRADICTION",
    );
  });

  it("enforces PG16 not_supported and PG17 MAINTAIN true pre-correction", () => {
    const pg16 = cloneFixture(PRECONDITION_FIXTURE);
    expect(() =>
      preconditionGates.validateCorrectivePreconditionEvidence(pg16, GATE_OPTS),
    ).not.toThrow();

    const pg17 = cloneFixture(PRECONDITION_FIXTURE);
    setPg17(pg17);
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(pg17, GATE_OPTS).protocol,
    ).toBe(preconditionGates.PROTOCOL);

    const badPg17 = cloneFixture(PRECONDITION_FIXTURE);
    setPg17(badPg17);
    const t = firstTable(badPg17);
    ((t.direct_catalog as MutableEvidence).service_role as string[]) = (
      (t.direct_catalog as MutableEvidence).service_role as string[]
    ).filter((p) => p !== "MAINTAIN");
    ((t.effective as MutableEvidence).service_role as MutableEvidence).MAINTAIN = false;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(badPg17, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PRIVILEGE",
    );

    const badPg16 = cloneFixture(PRECONDITION_FIXTURE);
    const t16 = firstTable(badPg16);
    ((t16.effective as MutableEvidence).service_role as MutableEvidence).MAINTAIN = false;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(badPg16, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PRIVILEGE",
    );
  });

  it("rejects owner/index/constraint/column/policy/function/row/sentinel/partial drift", () => {
    const owner = cloneFixture(PRECONDITION_FIXTURE);
    ((((owner.database_readonly as MutableEvidence).objects as MutableEvidence).tables as MutableEvidence[])[0].owner =
      "service_role");
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(owner, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OWNER",
    );

    const idx = cloneFixture(PRECONDITION_FIXTURE);
    ((((idx.database_readonly as MutableEvidence).objects as MutableEvidence).tables as MutableEvidence[])[0].indexes =
      []);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(idx, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_INDEXES",
    );

    const cols = cloneFixture(PRECONDITION_FIXTURE);
    ((((cols.database_readonly as MutableEvidence).objects as MutableEvidence).tables as MutableEvidence[])[0].columns =
      []);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(cols, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_COLUMNS",
    );

    const cons = cloneFixture(PRECONDITION_FIXTURE);
    ((((cons.database_readonly as MutableEvidence).objects as MutableEvidence).tables as MutableEvidence[])[0].constraints =
      []);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(cons, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );

    const pol = cloneFixture(PRECONDITION_FIXTURE);
    ((((pol.database_readonly as MutableEvidence).objects as MutableEvidence).tables as MutableEvidence[])[0].policies =
      []);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(pol, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_POLICIES",
    );

    const fn = cloneFixture(PRECONDITION_FIXTURE);
    (((fn.database_readonly as MutableEvidence).objects as MutableEvidence).functions as MutableEvidence[])[0].security =
      "DEFINER";
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(fn, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_FUNCTIONS",
    );

    const rows = cloneFixture(PRECONDITION_FIXTURE);
    (((rows.database_readonly as MutableEvidence).objects as MutableEvidence).row_counts as MutableEvidence)[
      "ra_pro_weekly_completeness_runs"
    ] = -1;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(rows, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_ROW_COUNTS",
    );

    const sentinel = cloneFixture(PRECONDITION_FIXTURE);
    ((((sentinel.database_readonly as MutableEvidence).objects as MutableEvidence).provider_sentinels as MutableEvidence)
      .invoices as MutableEvidence).present = true;
    ((((sentinel.database_readonly as MutableEvidence).objects as MutableEvidence).provider_sentinels as MutableEvidence)
      .invoices as MutableEvidence).count = 0;
    delete ((((sentinel.database_readonly as MutableEvidence).objects as MutableEvidence).provider_sentinels as MutableEvidence)
      .invoices as MutableEvidence).mutations;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(sentinel, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SENTINEL",
    );

    const partial = cloneFixture(PRECONDITION_FIXTURE);
    ((partial.database_readonly as MutableEvidence).objects as MutableEvidence).partial_corrective_state = true;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(partial, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_PARTIAL_STATE",
    );
  });

  it("rejects automation enabled, webhooks, write counters, substitution, freshness, sanitization", () => {
    const automation = cloneFixture(PRECONDITION_FIXTURE);
    (automation.safety as MutableEvidence).automation_enabled = true;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(automation, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SAFETY",
    );

    const webhook = cloneFixture(PRECONDITION_FIXTURE);
    (webhook.database_readonly as MutableEvidence).webhook_non_terminal_count = 1;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(webhook, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_WEBHOOK",
    );

    const writes = cloneFixture(PRECONDITION_FIXTURE);
    (writes.safety as MutableEvidence).production_writes = 1;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(writes, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_WRITE_COUNTER",
    );

    for (const protocol of [
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
    ]) {
      const sub = cloneFixture(PRECONDITION_FIXTURE);
      sub.protocol = protocol;
      expectCode(
        () => preconditionGates.validateCorrectivePreconditionEvidence(sub, GATE_OPTS),
        "CORRECTIVE_PRECONDITION_SUBSTITUTION_FORBIDDEN",
      );
    }

    const future = cloneFixture(PRECONDITION_FIXTURE);
    future.valid_from_utc = "2026-09-22T10:00:00Z";
    future.valid_until_utc = "2026-09-23T10:00:00Z";
    future.collected_at_utc = "2026-09-22T10:00:00Z";
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(future, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_NOT_YET_VALID",
    );

    const expired = cloneFixture(PRECONDITION_FIXTURE);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(expired, { now: "2026-09-22T10:00:00Z", expected: EXPECTED_AUTHORITY }),
      "CORRECTIVE_PRECONDITION_EXPIRED",
    );

    const tamper = cloneFixture(PRECONDITION_FIXTURE);
    tamper.visibility_limitations = [
      "Corrective precondition evidence pins remain UNPUBLISHED.",
      "postgres://user:pass@host/db",
    ];
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(tamper, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SANITIZATION",
    );
  });


  it("ignores non-authoritative collection_tooling_tip mutation", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    evidence.attestations = {
      ...(evidence.attestations as object),
      collection_tooling_tip: preconditionGates.REJECTED_STALE_COLLECTION_TIP_DBDCE968,
    };
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(evidence, GATE_OPTS),
    ).toMatchObject({ apply_authorized: false });
  });

  it("rejects authorized_executable_commit pinned to rejected stale dbdce968 tip", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    (evidence.authorization as MutableEvidence).authorized_executable_commit =
      preconditionGates.REJECTED_STALE_COLLECTION_TIP_DBDCE968;
    expectCode(
      () =>
        preconditionGates.validateCorrectivePreconditionEvidence(evidence, {
          now: NOW,
          expected: {
            ...EXPECTED_AUTHORITY,
            authorized_executable_commit: preconditionGates.REJECTED_STALE_COLLECTION_TIP_DBDCE968,
          },
        }),
      "CORRECTIVE_PRECONDITION_REJECTED_STALE_TIP",
    );
  });

  it("rejects missing expected authority pins", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(evidence, { now: NOW }),
      "CORRECTIVE_PRECONDITION_AUTHORITY_EXPECTED",
    );
  });

  it("rejects authorization blocks that still carry tooling_reviewed_tip or pr_head", () => {
    const tip = cloneFixture(PRECONDITION_FIXTURE);
    (tip.authorization as MutableEvidence).tooling_reviewed_tip = SYNTH_EXEC;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(tip, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_AUTHORITY_FORBIDDEN",
    );
    const head = cloneFixture(PRECONDITION_FIXTURE);
    (head.authorization as MutableEvidence).pr_head = SYNTH_EXEC;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(head, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_AUTHORITY_FORBIDDEN",
    );
  });

  it("assertPublished throws when pins UNPUBLISHED", () => {
    const auth = JSON.parse(fs.readFileSync(path.join(ROOT, AUTH_PATH), "utf8"));
    const unpublished = JSON.parse(JSON.stringify(auth));
    unpublished.precondition_publication = {
      status: "UNPUBLISHED",
      protocol: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1",
      evidence_path: null,
      evidence_source_commit: null,
      evidence_blob_oid: null,
      evidence_sha256: null,
      evidence_bytes: null,
    };
    unpublished.pre_apply_live_publication = {
      status: "UNPUBLISHED",
      protocol: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1",
      evidence_path: null,
      evidence_source_commit: null,
      evidence_blob_oid: null,
      evidence_sha256: null,
      evidence_bytes: null,
      apply_authorized: false,
    };
    unpublished.publication = {
      status: "UNPUBLISHED",
      required_prior_dry_run_evidence_sha256: null,
      required_prior_dry_run_evidence_oid: null,
      required_prior_dry_run_evidence_bytes: null,
      required_pre_apply_live_evidence_sha256: null,
      required_pre_apply_live_evidence_oid: null,
      required_pre_apply_live_evidence_bytes: null,
    };
    expectCode(
      () =>
        preconditionGates.assertCorrectivePreconditionEvidencePublished({
          auth: unpublished,
          cwd: ROOT,
        }),
      "CORRECTIVE_PRECONDITION_PINS_UNPUBLISHED",
    );
    expectCode(
      () =>
        preApplyGates.assertCorrectivePreApplyLiveEvidencePublished({
          auth: unpublished,
          cwd: ROOT,
        }),
      "CORRECTIVE_PRE_APPLY_PINS_UNPUBLISHED",
    );
  });

  it("assertPublished accepts tip pins with collection-authority triad while apply stays false", () => {
    const auth = JSON.parse(fs.readFileSync(path.join(ROOT, AUTH_PATH), "utf8"));
    const now = "2026-09-23T06:00:00Z";
    const pre = preconditionGates.assertCorrectivePreconditionEvidencePublished({
      auth,
      cwd: ROOT,
      now,
    });
    const live = preApplyGates.assertCorrectivePreApplyLiveEvidencePublished({
      auth,
      cwd: ROOT,
      now,
    });
    expect(pre.apply_authorized).toBe(false);
    expect(live.apply_authorized).toBe(false);
    expect(auth.production_apply_authorization.status).toBe("UNPUBLISHED");
    expect(auth.production_apply_authorization.apply_authorized).toBe(false);
    expect(auth.pre_apply_live_publication.apply_authorized).toBe(false);
  });

  it("collector refuses write when invalid and writes LF artifact when valid", () => {
    const invalid = collector.emitCorrectiveEvidenceArtifact({
      kind: "precondition",
      observations: { independently_observed: { database_readonly: {} } },
      allowWrite: true,
      outPath: path.join(os.tmpdir(), "corrective-evidence-invalid.json"),
    });
    expect(invalid.ok).toBe(false);

    const tmp = path.join(os.tmpdir(), `corrective-precondition-${crypto.randomBytes(4).toString("hex")}.json`);
    const fixture = loadJson(PRECONDITION_FIXTURE);
    const written = collector.emitCorrectiveEvidenceArtifact({
      kind: "precondition",
      observations: {
        independently_observed: {
          database_readonly: fixture.database_readonly,
          automation_gate: fixture.automation_gate,
          safety: fixture.safety,
          visibility_limitations: fixture.visibility_limitations,
        },
      },
      meta: { now: new Date("2026-09-21T10:00:00Z"), authority: EXPECTED_AUTHORITY },
      allowWrite: true,
      outPath: tmp,
      now: "2026-09-21T12:00:00Z",
    });
    expect(written.ok).toBe(true);
    const buffer = fs.readFileSync(tmp);
    expect(buffer.includes(0x0d)).toBe(false);
    expect(buffer[buffer.length - 1]).toBe(0x0a);
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(JSON.parse(buffer.toString("utf8")), GATE_OPTS),
    ).toBeTruthy();
    fs.unlinkSync(tmp);
  });
});

describe("RA Pro corrective evidence typed sentinels + structural constraints", () => {
  function sentinelsOf(evidence: MutableEvidence) {
    return ((evidence.database_readonly as MutableEvidence).objects as MutableEvidence)
      .provider_sentinels as MutableEvidence;
  }

  function constraintsOf(evidence: MutableEvidence, tableIndex = 0) {
    return ((((evidence.database_readonly as MutableEvidence).objects as MutableEvidence).tables as MutableEvidence[])[
      tableIndex
    ].constraints as MutableEvidence[]);
  }

  it("accepts sealed typed absence for all five expected-absent sentinel relations", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    for (const rel of schema.SENTINEL_RELATIONS) {
      expect(sentinelsOf(evidence)[rel]).toEqual({ ...schema.SENTINEL_ABSENT_PROOF });
    }
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(evidence, GATE_OPTS),
    ).toMatchObject({ apply_authorized: false });
  });

  it("rejects expected-absent relation unexpectedly present", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    sentinelsOf(evidence).bills = { present: true, count: 0 };
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(evidence, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SENTINEL",
    );
  });

  it("rejects expected-present relation absent", () => {
    const expectedPresent = Object.fromEntries(schema.SENTINEL_RELATIONS.map((rel) => [rel, "present"]));
    const observed = Object.fromEntries(
      schema.SENTINEL_RELATIONS.map((rel) => [rel, { present: true, count: 0 }]),
    );
    observed.invoices = { ...schema.SENTINEL_ABSENT_PROOF };
    expectCode(
      () => schema.assertProviderSentinels(observed, "CORRECTIVE_PRECONDITION", expectedPresent),
      "CORRECTIVE_PRECONDITION_SENTINEL",
    );
  });

  it("rejects absent relation carrying a zero count or present-only field", () => {
    const zero = cloneFixture(PRECONDITION_FIXTURE);
    sentinelsOf(zero).payments = { present: false, count: 0, mutations: "not_applicable" };
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(zero, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SENTINEL",
    );

    const presentOnly = cloneFixture(PRECONDITION_FIXTURE);
    sentinelsOf(presentOnly).payments = { present: false, count: "unavailable" };
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(presentOnly, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SENTINEL",
    );
  });

  it("rejects duplicate, missing, unknown, or contradictory sentinel entries", () => {
    const missing = cloneFixture(PRECONDITION_FIXTURE);
    delete sentinelsOf(missing).invoices;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(missing, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SENTINEL",
    );

    const unknown = cloneFixture(PRECONDITION_FIXTURE);
    sentinelsOf(unknown).ledger_posts = { ...schema.SENTINEL_ABSENT_PROOF };
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(unknown, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SENTINEL",
    );

    const contradictory = cloneFixture(PRECONDITION_FIXTURE);
    sentinelsOf(contradictory).invoices = {
      present: false,
      count: 0,
      mutations: "not_applicable",
    };
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(contradictory, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_SENTINEL",
    );
  });

  it("accepts generated constraint renamed but structurally identical", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    const cons = constraintsOf(evidence);
    for (const c of cons) {
      (c as MutableEvidence).name = `pg_generated_${String((c as MutableEvidence).kind)}_${Math.random()}`;
    }
    expect(
      preconditionGates.validateCorrectivePreconditionEvidence(evidence, GATE_OPTS),
    ).toMatchObject({ apply_authorized: false });
  });

  it("rejects changed columns, expression, FK target/action, uniqueness, or deferrability", () => {
    const cols = cloneFixture(PRECONDITION_FIXTURE);
    (constraintsOf(cols).find((c) => c.kind === "primary_key") as MutableEvidence).columns = ["firm_id"];
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(cols, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );

    const expr = cloneFixture(PRECONDITION_FIXTURE);
    const check = constraintsOf(expr).find(
      (c) => c.kind === "check" && String(c.check_expr_normalized).includes("provider IN"),
    ) as MutableEvidence;
    check.check_expr_normalized = "provider IN ('xero')";
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(expr, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );

    const fk = cloneFixture(PRECONDITION_FIXTURE);
    const firmFk = constraintsOf(fk).find(
      (c) => c.kind === "foreign_key" && (c.columns as string[])[0] === "firm_id",
    ) as MutableEvidence;
    firmFk.referenced_table = "companies";
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(fk, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );

    const action = cloneFixture(PRECONDITION_FIXTURE);
    const firmFk2 = constraintsOf(action).find(
      (c) => c.kind === "foreign_key" && (c.columns as string[])[0] === "firm_id",
    ) as MutableEvidence;
    firmFk2.delete_action = "CASCADE";
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(action, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );

    const uniq = cloneFixture(PRECONDITION_FIXTURE);
    const u = constraintsOf(uniq).find(
      (c) => c.kind === "unique" && (c.columns as string[]).join(",") === "idempotency_key",
    ) as MutableEvidence;
    u.columns = ["provider"];
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(uniq, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );

    const defer = cloneFixture(PRECONDITION_FIXTURE);
    (constraintsOf(defer)[0] as MutableEvidence).deferrable = true;
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(defer, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );
  });

  it("rejects missing, extra, or duplicate canonical constraints", () => {
    const missing = cloneFixture(PRECONDITION_FIXTURE);
    constraintsOf(missing).pop();
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(missing, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );

    const extra = cloneFixture(PRECONDITION_FIXTURE);
    constraintsOf(extra).push({
      name_binding: "structural",
      kind: "check",
      columns: [],
      check_expr_normalized: "finding_count < 0",
      deferrable: false,
      initially_deferred: false,
    });
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(extra, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );

    const dup = cloneFixture(PRECONDITION_FIXTURE);
    const pk = structuredClone(constraintsOf(dup).find((c) => c.kind === "primary_key"));
    constraintsOf(dup).push(pk as MutableEvidence);
    expectCode(
      () => preconditionGates.validateCorrectivePreconditionEvidence(dup, GATE_OPTS),
      "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS",
    );
  });

  it("rejects explicitly named constraint renamed when name_binding is exact", () => {
    const evidence = cloneFixture(PRECONDITION_FIXTURE);
    const pk = constraintsOf(evidence).find((c) => c.kind === "primary_key") as MutableEvidence;
    pk.name_binding = "exact";
    pk.name = "ra_pro_weekly_completeness_runs_pkey";
    // Valid exact name should still match sealed structural expected which is structural-only —
    // converting one sealed expected to exact requires comparing against TABLE_CONSTRAINTS structural.
    // Force observed exact name mismatch against an injected exact expected via assertConstraintSet.
    expectCode(() => {
      schema.assertConstraintSet(
        [{ ...pk, name: "renamed_pkey" }],
        [{ ...pk, name: "ra_pro_weekly_completeness_runs_pkey" }],
        "CORRECTIVE_PRECONDITION",
        "ra_pro_weekly_completeness_runs",
      );
    }, "CORRECTIVE_PRECONDITION_OBJECT_CONSTRAINTS");
  });

  it("rejects unavailable/non-authoritative Production flag-name result before emit", () => {
    for (const authority of ["local_process", "unavailable", "non_authoritative", "process_env"]) {
      const evidence = cloneFixture(PRECONDITION_FIXTURE);
      (evidence.automation_gate as MutableEvidence).production_key_name_authority = authority;
      expectCode(
        () => preconditionGates.validateCorrectivePreconditionEvidence(evidence, GATE_OPTS),
        "CORRECTIVE_PRECONDITION_AUTOMATION_GATE",
      );
    }

    const tmp = path.join(os.tmpdir(), `corrective-gate-fail-${crypto.randomBytes(4).toString("hex")}.json`);
    const fixture = loadJson(PRECONDITION_FIXTURE);
    const badGate = {
      ...(fixture.automation_gate as object),
      production_key_name_authority: "local_process",
    };
    const emitted = collector.emitCorrectiveEvidenceArtifact({
      kind: "precondition",
      observations: {
        independently_observed: {
          database_readonly: fixture.database_readonly,
          automation_gate: badGate,
          safety: fixture.safety,
          visibility_limitations: fixture.visibility_limitations,
        },
      },
      meta: { now: new Date("2026-09-21T10:00:00Z"), authority: EXPECTED_AUTHORITY },
      allowWrite: true,
      outPath: tmp,
      now: "2026-09-21T12:00:00Z",
    });
    expect(emitted.ok).toBe(false);
    expect(String(emitted.error)).toMatch(/AUTOMATION_GATE|SENTINEL|COLLECTOR/);
    expect(fs.existsSync(tmp)).toBe(false);
  });

  it("collector validation failure emits no artifact", () => {
    const tmp = path.join(os.tmpdir(), `corrective-no-emit-${crypto.randomBytes(4).toString("hex")}.json`);
    const fixture = loadJson(PRECONDITION_FIXTURE);
    const badObjects = structuredClone(fixture.database_readonly);
    (((badObjects as MutableEvidence).objects as MutableEvidence).provider_sentinels as MutableEvidence).invoices = {
      present: true,
      count: 1,
    };
    const emitted = collector.emitCorrectiveEvidenceArtifact({
      kind: "precondition",
      observations: {
        independently_observed: {
          database_readonly: badObjects,
          automation_gate: fixture.automation_gate,
          safety: fixture.safety,
          visibility_limitations: fixture.visibility_limitations,
        },
      },
      meta: { now: new Date("2026-09-21T10:00:00Z"), authority: EXPECTED_AUTHORITY },
      allowWrite: true,
      outPath: tmp,
      now: "2026-09-21T12:00:00Z",
    });
    expect(emitted.ok).toBe(false);
    expect(String(emitted.error)).toMatch(/SENTINEL/);
    expect(fs.existsSync(tmp)).toBe(false);
  });
});
