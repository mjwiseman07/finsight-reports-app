import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  AFTER_DUAL_PRE_APPLY_WINDOW,
  DUAL_PUBLICATION,
} from "./helpers/ra-pro-accounting-automation-dual-immutable-pins";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const gates = require("../../scripts/security/ra-pro-accounting-automation-pre-apply-gates");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertAuthorizationPublished } = require("../../scripts/security/ra-pro-accounting-automation-apply-core");

const ROOT = process.cwd();
const FIXTURE = "tests/security/helpers/fixtures/ra-pro-accounting-automation-pre-apply-live-synthetic.json";
const CONTRACT = "docs/security/ra-pro-accounting-automation-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json";
const AUTH = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";
const NOW = "2026-09-19T12:00:00Z";

function gitEnv() {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: ROOT.replace(/\\/g, "/"),
  };
}

function git(args: string[]) {
  const run = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true, env: gitEnv() });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout);
  return (run.stdout || "").trim();
}

function loadFixture() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURE), "utf8"));
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

function psCheck(mutate: string) {
  const script = `
    . '${path.join(ROOT, "scripts/security/ra-pro-accounting-automation-pre-apply-gates.ps1").replace(/'/g, "''")}'
    $e = Get-Content -LiteralPath '${path.join(ROOT, FIXTURE).replace(/'/g, "''")}' -Raw | ConvertFrom-Json
    ${mutate}
    try {
      Test-AccountingPreApplyLiveObject -Evidence $e -NowUtc '${NOW}'
      Write-Output 'PASS'
    } catch {
      Write-Output $_.Exception.Message
    }
  `;
  const run = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { cwd: ROOT, encoding: "utf8", windowsHide: true },
  );
  return `${run.stdout || ""}${run.stderr || ""}`;
}

describe("RA Pro accounting-automation pre-apply live gate", () => {
  it("publishes the reviewed pre-apply blob and keeps apply unauthorized", () => {
    const auth = JSON.parse(fs.readFileSync(path.join(ROOT, AUTH), "utf8"));
    const evidenceRel =
      "docs/security/ra-pro-accounting-automation-apply/RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1.json";
    expect(auth.publication.status).toBe("PUBLISHED");
    expect(auth.publication.required_pre_apply_live_evidence_sha256).toBe(
      "2ed897b17fc964619454a3eb3a40899cd9a08eede5481324f636762528d43c3e",
    );
    expect(auth.publication.required_pre_apply_live_evidence_bytes).toBe(4059);
    expect(auth.pre_apply_live_publication.status).toBe("PUBLISHED");
    expect(auth.pre_apply_live_publication.evidence_path).toBe(evidenceRel);
    expect(auth.pre_apply_live_publication.evidence_sha256).toBe(
      auth.publication.required_pre_apply_live_evidence_sha256,
    );
    expect(auth.pre_apply_live_publication.evidence_blob_oid).toBe(
      auth.publication.required_pre_apply_live_evidence_oid,
    );
    expect(auth.pre_apply_live_publication.evidence_bytes).toBe(4059);
    expect(auth.pre_apply_live_publication.apply_authorized).toBe(false);
    expect(String(auth.pre_apply_live_publication.independent_review_visibility_limitations.join("\n"))).toMatch(
      /flag-name lookup/i,
    );
    const spec = `${auth.pre_apply_live_publication.evidence_source_commit}:${evidenceRel}`;
    expect(git(["rev-parse", spec])).toBe(auth.pre_apply_live_publication.evidence_blob_oid);
    expect(auth.publication.required_prior_dry_run_evidence_sha256).toBe(gates.PRIOR_SHA256);
    expect(auth.prior_dry_run_publication.status).toBe("PUBLISHED");
    const contract = JSON.parse(fs.readFileSync(path.join(ROOT, CONTRACT), "utf8"));
    expect(contract.protocol).toBe(gates.PROTOCOL);
    expect(contract.publication_status).toBe("UNPUBLISHED");
    expect(contract.bindings.collection_pr_head).toBe(gates.COLLECTION_PR_HEAD);
    expect(contract.bindings.production_commit).toBe(gates.PRODUCTION_COMMIT);
    expect(contract.bindings.history_count).toBe(gates.HISTORY_COUNT);
  });

  it("accepts the synthetic fixture inside the freshness window and refuses the listed failures", () => {
    const fresh = loadFixture();
    expect(gates.validatePreApplyLiveEvidence(fresh, { now: NOW }).apply_authorized).toBe(false);

    const expired = loadFixture();
    expectCode(() => gates.validatePreApplyLiveEvidence(expired, { now: "2026-09-20T03:00:15Z" }), "PRE_APPLY_LIVE_EXPIRED");
    const future = loadFixture();
    expectCode(() => gates.validatePreApplyLiveEvidence(future, { now: "2026-09-19T03:00:14Z" }), "PRE_APPLY_LIVE_NOT_YET_VALID");

    const wrongHead = loadFixture();
    wrongHead.authorization.pr_head = "b".repeat(40);
    expectCode(() => gates.validatePreApplyLiveEvidence(wrongHead, { now: NOW }), "PRE_APPLY_LIVE_HEAD_MISMATCH");

    for (const protocol of [
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
    ]) {
      const sub = loadFixture();
      sub.protocol = protocol;
      expectCode(() => gates.validatePreApplyLiveEvidence(sub, { now: NOW }), "PRE_APPLY_LIVE_SUBSTITUTION_FORBIDDEN");
    }

    const open = loadFixture();
    open.automation_gate.effective_state = "open";
    expectCode(() => gates.validatePreApplyLiveEvidence(open, { now: NOW }), "PRE_APPLY_LIVE_AUTOMATION_GATE_OPEN");

    const history = loadFixture();
    history.database_readonly.history_count = 187;
    expectCode(() => gates.validatePreApplyLiveEvidence(history, { now: NOW }), "PRE_APPLY_LIVE_HISTORY_DRIFT");

    const objects = loadFixture();
    objects.database_readonly.target_relation_count = 1;
    expectCode(() => gates.validatePreApplyLiveEvidence(objects, { now: NOW }), "PRE_APPLY_LIVE_OBJECT_DRIFT");

    const inventory = loadFixture();
    inventory.database_readonly.authorizing_inventory.company_owned = 4;
    inventory.database_readonly.authorizing_inventory.firm_owned = 0;
    expectCode(() => gates.validatePreApplyLiveEvidence(inventory, { now: NOW }), "PRE_APPLY_LIVE_INVENTORY_DRIFT");

    const sum = loadFixture();
    sum.database_readonly.authorizing_inventory.company_owned = 2;
    expectCode(() => gates.validatePreApplyLiveEvidence(sum, { now: NOW }), "PRE_APPLY_LIVE_CONTRADICTION");

    const webhook = loadFixture();
    webhook.database_readonly.webhook_non_terminal_count = 1;
    expectCode(() => gates.validatePreApplyLiveEvidence(webhook, { now: NOW }), "PRE_APPLY_LIVE_WEBHOOK_NOT_QUIESCENT");

    const status = loadFixture();
    status.database_readonly.webhook_non_terminal_statuses = ["received", "processing", "processed"];
    expectCode(() => gates.validatePreApplyLiveEvidence(status, { now: NOW }), "PRE_APPLY_LIVE_WEBHOOK_NOT_QUIESCENT");

    const writes = loadFixture();
    writes.safety.provider_writes = 1;
    expectCode(() => gates.validatePreApplyLiveEvidence(writes, { now: NOW }), "PRE_APPLY_LIVE_WRITE_COUNTER");

    const partial = loadFixture();
    partial.database_readonly.partial_accounting_automation_state = true;
    expectCode(() => gates.validatePreApplyLiveEvidence(partial, { now: NOW }), "PRE_APPLY_LIVE_PARTIAL_STATE");
  });

  it("rejects missing, tampered, CRLF, and BOM evidence bytes", () => {
    const text = `${JSON.stringify(loadFixture())}\n`;
    gates.assertPreApplyEvidenceBytes(Buffer.from(text, "utf8"));
    expectCode(() => gates.assertPreApplyEvidenceBytes(Buffer.from(text.replace("\n", "\r\n"), "utf8")), "PRE_APPLY_LIVE_NEWLINE");
    expectCode(
      () => gates.assertPreApplyEvidenceBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, "utf8")])),
      "PRE_APPLY_LIVE_NEWLINE",
    );
    expectCode(
      () =>
        gates.assertPreApplyLiveEvidencePublished({
          auth: {
            ceremony_source_commit: "a".repeat(40),
            pre_apply_live_contract: { path: "missing", source_commit: "a".repeat(40) },
          },
          cwd: ROOT,
          env: {},
        }),
      "PRE_APPLY_LIVE_CONTRACT_UNSEALED",
    );
  });

  it("refuses path and environment overrides before blob load", () => {
    expectCode(
      () => gates.assertPreApplyLiveEvidencePublished({ preApplyEvidencePath: FIXTURE, env: {}, cwd: ROOT, auth: {} }),
      "PRE_APPLY_LIVE_EVIDENCE_PATH_OVERRIDE_FORBIDDEN",
    );
    expectCode(
      () =>
        gates.assertPreApplyLiveEvidencePublished({
          env: { RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_SHA256: "abc" },
          cwd: ROOT,
          auth: {},
        }),
      "PRE_APPLY_LIVE_EVIDENCE_ENV_OVERRIDE_FORBIDDEN",
    );
  });

  it("apply authorization still throws before credentials after the pin is published", () => {
    expectCode(
      () => assertAuthorizationPublished({ publicationCommit: DUAL_PUBLICATION, cwd: ROOT, now: AFTER_DUAL_PRE_APPLY_WINDOW }),
      "APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS|PRE_APPLY_LIVE_EXPIRED",
    );
    const core = fs.readFileSync(
      path.join(ROOT, "scripts/security/ra-pro-accounting-automation-apply-core.js"),
      "utf8",
    );
    const run = core.slice(core.indexOf("async function runApply"));
    const gate = run.indexOf("assertApplyAuthorizationPublished");
    const url = run.indexOf("resolveDatabaseUrlFromEnv");
    const client = run.indexOf("withClient");
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(url);
    expect(url).toBeLessThan(client);
    const entry = fs.readFileSync(
      path.join(ROOT, "scripts/security/enter-ra-pro-accounting-automation-apply.ps1"),
      "utf8",
    );
    const call = entry.indexOf("Assert-AccountingPreApplyLiveEvidence");
    const launch = entry.indexOf("$ceremonyDest =");
    expect(call).toBeGreaterThan(0);
    expect(call).toBeLessThan(launch);
    expect(entry).not.toContain("APPLY_CEREMONY_UNREACHABLE");
  });

  it("loads a published git blob only from committed pins and still does not authorize apply", () => {
    const head = git(["rev-parse", "HEAD"]);
    const spec = `${head}:${FIXTURE}`;
    const oid = git(["rev-parse", spec]);
    const buf = spawnSync("git", ["show", spec], { cwd: ROOT, windowsHide: true, env: gitEnv() }).stdout as Buffer;
    const sha = crypto.createHash("sha256").update(buf).digest("hex");
    const auth = JSON.parse(fs.readFileSync(path.join(ROOT, AUTH), "utf8"));
    auth.publication.status = "PUBLISHED";
    auth.publication.required_pre_apply_live_evidence_sha256 = sha;
    auth.publication.required_pre_apply_live_evidence_oid = oid;
    auth.publication.required_pre_apply_live_evidence_bytes = buf.length;
    auth.pre_apply_live_publication.status = "PUBLISHED";
    auth.pre_apply_live_publication.evidence_path = FIXTURE;
    auth.pre_apply_live_publication.evidence_source_commit = head;
    auth.pre_apply_live_publication.evidence_blob_oid = oid;
    auth.pre_apply_live_publication.evidence_sha256 = sha;
    auth.pre_apply_live_publication.evidence_bytes = buf.length;
    const ok = gates.assertPreApplyLiveEvidencePublished({ auth, cwd: ROOT, env: {}, now: NOW });
    expect(ok.apply_authorized).toBe(false);
    expect(ok.sha256).toBe(sha);
    auth.pre_apply_live_publication.evidence_sha256 = "0".repeat(64);
    auth.publication.required_pre_apply_live_evidence_sha256 = "0".repeat(64);
    expectCode(
      () => gates.assertPreApplyLiveEvidencePublished({ auth, cwd: ROOT, env: {}, now: NOW }),
      "BLOCKED_PIN_MISMATCH",
    );
    auth.pre_apply_live_publication.evidence_path = "docs/security/missing-pre-apply.json";
    auth.pre_apply_live_publication.evidence_sha256 = sha;
    auth.publication.required_pre_apply_live_evidence_sha256 = sha;
    expectCode(
      () => gates.assertPreApplyLiveEvidencePublished({ auth, cwd: ROOT, env: {}, now: NOW }),
      "GIT_BLOB_LOAD_FAILED",
    );
  });

  it("PowerShell gate refuses the same fail-closed cases", () => {
    expect(psCheck("")).toMatch(/PASS/);
    expect(psCheck("$e.authorization.pr_head = 'b' * 40")).toMatch(/PRE_APPLY_LIVE_HEAD_MISMATCH/);
    expect(
      psCheck(
        "$e.valid_from_utc = '2026-09-20T03:00:15Z'; $e.collection_started_at_utc = $e.valid_from_utc; $e.collection_ended_at_utc = '2026-09-20T03:04:57Z'; $e.valid_until_utc = '2026-09-21T03:00:15Z'",
      ),
    ).toMatch(/PRE_APPLY_LIVE_NOT_YET_VALID/);
    expect(
      psCheck(
        "$e.valid_from_utc = '2026-09-18T12:00:00Z'; $e.collection_started_at_utc = $e.valid_from_utc; $e.valid_until_utc = '2026-09-19T12:00:00Z'",
      ),
    ).toMatch(/PRE_APPLY_LIVE_EXPIRED/);
    expect(psCheck("$e.automation_gate.production_presence = 'present'")).toMatch(/PRE_APPLY_LIVE_AUTOMATION_GATE_OPEN/);
    expect(psCheck("$e.database_readonly.history_count = 189")).toMatch(/PRE_APPLY_LIVE_HISTORY_DRIFT/);
    expect(psCheck("$e.database_readonly.webhook_non_terminal_count = 2")).toMatch(/PRE_APPLY_LIVE_WEBHOOK_NOT_QUIESCENT/);
    expect(psCheck("$e.safety.production_writes = 1")).toMatch(/PRE_APPLY_LIVE_WRITE_COUNTER/);
    expect(psCheck("$e.database_readonly.authorizing_inventory.company_owned = 4; $e.database_readonly.authorizing_inventory.firm_owned = 0")).toMatch(/PRE_APPLY_LIVE_INVENTORY_DRIFT/);
    expect(psCheck("$e.protocol = 'RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1'")).toMatch(/PRE_APPLY_LIVE_SUBSTITUTION_FORBIDDEN/);
  });

  it("sealed entry selects the gate", () => {
    const auth = JSON.parse(fs.readFileSync(path.join(ROOT, AUTH), "utf8"));
    const source = String(auth.ceremony_source_commit);
    const entry = spawnSync("git", ["show", `${source}:scripts/security/enter-ra-pro-accounting-automation-apply.ps1`], {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      env: gitEnv(),
    }).stdout as string;
    const call = entry.indexOf("Assert-AccountingPreApplyLiveEvidence");
    const launch = entry.indexOf("$ceremonyDest =");
    expect(call).toBeGreaterThan(0);
    expect(call).toBeLessThan(launch);
  });
});
