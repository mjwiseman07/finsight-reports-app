/**
 * RA Pro prior-dry-run pin publication regressions.
 * Tip fixture identity + gate accept/reject + harness stop-after-prior.
 * No production credentials, DB, gate/Stripe/Vercel/Supabase contact.
 */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
);
const GATES = path.join(
  ROOT,
  "scripts/security/ra-pro-cutover-prior-dry-run-gates.ps1",
);
const APPLY =
  "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1";
const FIXTURE_REL =
  "tests/security/helpers/fixtures/ra-pro-cutover-prior-production-dry-run-evidence.json";
const FIXTURE = path.join(ROOT, FIXTURE_REL);
const PIN =
  "9679678436659c64857c47397b5196343e11b8e3cc8277b7af0594a99b4f9a88";
const OID = "fcf25851787047b4ea8d2b276856dd74e024f5aa";
const BYTES = 112020;
const DRY_RUN_TIP = "c4c414f8879d546a53bbd668431db0c5dfadcbb3";
const FREEZE = "a74d5108752d93e1ca4baa78f4dc7425120658b7";
const BUNDLE_SOURCE = "90af07d27e122d80d5fb5072f7a66da818f245a5";
const PRECOND =
  "fb3625f99027c600c1b1280f103df723b4fbff56ee21c60a3c8ed6e2789a7cd3";
const REJECTED = [
  "b6c204f2da78ad11b0c92b4d9325ae214c8811052e31d43151dcfa1b855332ce",
  "6ff61df92e857e164f1c6c7250d9b0c1466164d68d7644fe89d5fa425e2b229e",
];
const FORBIDDEN =
  /postgres(ql)?:\/\/[^:]+:[^@]+@|sk_live_|whsec_|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./i;
const isWin = process.platform === "win32";

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function readAuth(): Record<string, any> {
  return JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
}

function systemPowerShell(): string {
  return path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

function psLiteral(p: string): string {
  return "'" + p.replace(/'/g, "''") + "'";
}

function runPs(script: string): { status: number | null; out: string } {
  const r = spawnSync(
    systemPowerShell(),
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000 },
  );
  return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
}

function assertEvidence(pathEvidence: string, authPath: string) {
  return runPs(`
    $ErrorActionPreference = 'Stop'
    . ${psLiteral(GATES)}
    $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
    try {
      $meta = Assert-PriorDryRunEvidence -Path ${psLiteral(pathEvidence)} -Auth $auth
      Write-Output ('ACCEPTED:' + [string]$meta.sha256)
      exit 0
    } catch {
      Write-Output ([string]\$_.Exception.Message)
      exit 1
    }
  `);
}

describe("RA Pro prior-dry-run pin publication (static)", () => {
  it("tip auth publishes exact prior pins and rejects sandbox SHAs", () => {
    const auth = readAuth();
    expect(auth.published_prior_dry_run.status).toBe("PUBLISHED");
    expect(auth.required_prior_dry_run_evidence_sha256).toBe(PIN);
    expect(auth.required_prior_dry_run_freeze).toBe(FREEZE);
    expect(auth.required_prior_dry_run_evidence_tip).toBe(DRY_RUN_TIP);
    expect(auth.required_prior_dry_run_bundle_source).toBe(BUNDLE_SOURCE);
    expect(auth.published_prior_dry_run.evidence_fixture_path).toBe(FIXTURE_REL);
    expect(auth.published_prior_dry_run.evidence_bytes).toBe(BYTES);
    expect(auth.published_prior_dry_run.evidence_blob_oid).toBe(OID);
    expect(auth.published_prior_dry_run.evidence_line_endings).toBe("CRLF");
    expect(auth.published_prior_dry_run.accepted_precondition_evidence_sha256).toBe(
      PRECOND,
    );
    expect(auth.published_prior_dry_run.verdict).toBe(
      "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
    );
    expect(auth.published_prior_dry_run.read_only).toBe(true);
    expect(auth.published_prior_dry_run.databaseConnectionAttempts).toBe(1);
    expect(auth.published_prior_dry_run.sqlApplicationAttempts).toBe(0);
    expect(auth.published_prior_dry_run.advisory_lock_acquired).toBe(false);
    expect(auth.published_prior_dry_run.prior_history_count).toBe(187);
    expect(auth.published_prior_dry_run.version_absent).toBe(true);
    expect(auth.published_prior_dry_run.migration_objects_absent).toBe(true);
    expect(auth.published_prior_dry_run.cleanup_completed).toBe(true);
    expect(auth.published_prior_dry_run.apply_authorization_embedded).toBe(false);
    expect(auth.published_prior_dry_run.fresh_pre_apply_live_checks_still_required).toBe(
      true,
    );
    for (const sha of REJECTED) {
      expect(auth.published_prior_dry_run.rejected_evidence_sha256).toContain(sha);
    }
    expect(auth.authorized_pr_head).toBe(FREEZE);
    expect(auth.bundle_source_commit).toBe(BUNDLE_SOURCE);
    expect(JSON.stringify(auth)).not.toMatch(FORBIDDEN);
  });

  it("committed evidence blob is exact CRLF pin identity", () => {
    const buf = fs.readFileSync(FIXTURE);
    expect(buf.length).toBe(BYTES);
    expect(buf.includes(0x0d)).toBe(true);
    expect(sha256(buf)).toBe(PIN);
    const tip = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    const oid = execFileSync("git", ["rev-parse", `${tip}:${FIXTURE_REL}`], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    expect(oid).toBe(OID);
    const blob = execFileSync("git", ["cat-file", "blob", `${tip}:${FIXTURE_REL}`], {
      cwd: ROOT,
    }) as Buffer;
    expect(blob.length).toBe(BYTES);
    expect(sha256(blob)).toBe(PIN);
    const ga = fs.readFileSync(path.join(ROOT, ".gitattributes"), "utf8");
    expect(ga).toMatch(
      /ra-pro-cutover-prior-production-dry-run-evidence\.json\s+-text/,
    );
  });

  it("tip seals match worktree for apply ceremony, entry, and prior gates", () => {
    const auth = readAuth();
    for (const key of [
      "operator_apply_ceremony",
      "visible_ceremony_entry",
      "prior_dry_run_gates",
    ] as const) {
      const seal = auth[key];
      const buf = fs.readFileSync(path.join(ROOT, seal.path));
      expect(sha256(buf)).toBe(seal.sha256);
      expect(buf.length).toBe(seal.bytes);
      const oid = execFileSync("git", ["hash-object", seal.path], {
        cwd: ROOT,
        encoding: "utf8",
      }).trim();
      expect(oid).toBe(seal.oid);
    }
  });

  it("unchanged freeze/source/migration/decision authorities", () => {
    const auth = readAuth();
    expect(auth.authorized_pr_head).toBe(FREEZE);
    expect(auth.bundle_source_commit).toBe(BUNDLE_SOURCE);
    expect(auth.migration_blob_oid).toBe(
      "d36f5e2c50f7bab956c3191723c0e8a223279df5",
    );
    expect(auth.migration_sha256).toBe(
      "c756651f267aaa2ebe5f1331e96d62bfa882507917b4201397f77e25a45f5ff9",
    );
    expect(auth.migration_bytes).toBe(40289);
    expect(auth.decision_blob_oid).toBe(
      "0dd39de5ffbfd2b35d3d73887dd0fa915a061c93",
    );
    expect(auth.standalone_bundle.oid).toBe(
      "7d6fda19b42c0ac12dfdc6f12e81acfcf6108592",
    );
    expect(auth.standalone_bundle.sha256).toBe(
      "959286d36bdb8e28535d7c4e1daad8c5fc470208e1e1e467c282a461ba62faf6",
    );
    expect(auth.standalone_bundle.bytes).toBe(287453);
  });
});

describe.skipIf(!isWin)("RA Pro prior-dry-run gates + apply boundary (Windows)", () => {
  it("exact fixture accepted; LF/CRLF derivative, tamper, missing, external, sandbox rejected", () => {
    const auth = readAuth();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-prior-pub-"));
    try {
      const authPath = path.join(dir, "auth.json");
      fs.writeFileSync(authPath, `${JSON.stringify(auth, null, 2)}\n`);

      const ok = assertEvidence(FIXTURE, authPath);
      expect(ok.status, ok.out).toBe(0);
      expect(ok.out).toContain(`ACCEPTED:${PIN}`);

      const crlfBuf = fs.readFileSync(FIXTURE);
      const lfPath = path.join(dir, "lf.json");
      const lfBuf = Buffer.from(crlfBuf.toString("utf8").replace(/\r\n/g, "\n"));
      fs.writeFileSync(lfPath, lfBuf);
      expect(sha256(lfBuf)).not.toBe(PIN);
      const lfRej = assertEvidence(lfPath, authPath);
      expect(lfRej.status).toBe(1);
      expect(lfRej.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH/);

      const tamperPath = path.join(dir, "tamper.json");
      const tamper = Buffer.concat([crlfBuf, Buffer.from(" ")]);
      fs.writeFileSync(tamperPath, tamper);
      const tamperRej = assertEvidence(tamperPath, authPath);
      expect(tamperRej.status).toBe(1);
      expect(tamperRej.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH/);

      const missing = assertEvidence(path.join(dir, "missing.json"), authPath);
      expect(missing.status).toBe(1);
      expect(missing.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_MISSING/);

      const external = path.join(dir, "external.json");
      fs.writeFileSync(
        external,
        `${JSON.stringify({ result_code: "DRY_RUN_READY", applicator: {} }, null, 2)}\n`,
      );
      const extRej = assertEvidence(external, authPath);
      expect(extRej.status).toBe(1);
      expect(extRej.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH/);

      for (const sha of REJECTED) {
        const bogus = path.join(dir, `${sha.slice(0, 8)}.json`);
        fs.writeFileSync(bogus, `${JSON.stringify({ rejected: sha }, null, 2)}\n`);
        expect(sha256(fs.readFileSync(bogus))).not.toBe(PIN);
        const r = assertEvidence(bogus, authPath);
        expect(r.status).toBe(1);
        expect(r.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH/);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("apply ceremony tip-materializes prior evidence then stops before credentials/DB", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-prior-boundary-"));
    try {
      const r = spawnSync(
        systemPowerShell(),
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          path.join(ROOT, APPLY),
          "-PrHead",
          FREEZE,
          "-RepoRoot",
          ROOT,
          "-EvidenceOutDir",
          outDir,
        ],
        {
          cwd: ROOT,
          encoding: "utf8",
          windowsHide: true,
          timeout: 180000,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            USERPROFILE: process.env.USERPROFILE,
            RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRIOR_EVIDENCE: "1",
          },
        },
      );
      const combined = String(r.stdout || "") + String(r.stderr || "");
      expect(combined).toMatch(/TEST_BOUNDARY_PRIOR_EVIDENCE_ACCEPTED|TEST_BOUNDARY_STOP_AFTER_PRIOR_EVIDENCE/);
      const summaryPath = path.join(outDir, "PRODUCTION_APPLY_SUMMARY.json");
      expect(fs.existsSync(summaryPath)).toBe(true);
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      expect(summary.result_code).toBe("TEST_BOUNDARY_STOP_AFTER_PRIOR_EVIDENCE");
      expect(summary.prior_dry_run_evidence_sha256).toBe(PIN);
      expect(summary.databaseConnectionAttempts ?? 0).toBe(0);
      expect(summary.sqlApplicationAttempts ?? 0).toBe(0);
      expect(JSON.stringify(summary)).not.toMatch(FORBIDDEN);
      expect(combined).not.toMatch(FORBIDDEN);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("path/env prior-evidence overrides remain forbidden under published pins", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-prior-override-"));
    try {
      const r = spawnSync(
        systemPowerShell(),
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          path.join(ROOT, APPLY),
          "-PrHead",
          FREEZE,
          "-RepoRoot",
          ROOT,
          "-EvidenceOutDir",
          outDir,
          "-PriorDryRunEvidencePath",
          FIXTURE,
        ],
        {
          cwd: ROOT,
          encoding: "utf8",
          windowsHide: true,
          timeout: 120000,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            USERPROFILE: process.env.USERPROFILE,
            RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRIOR_EVIDENCE: "1",
          },
        },
      );
      const combined = String(r.stdout || "") + String(r.stderr || "");
      expect(combined).toMatch(
        /PRIOR_DRY_RUN_EVIDENCE_PATH_OVERRIDE_FORBIDDEN|BLOCKED_PRIOR_DRY_RUN/,
      );
      expect(combined).not.toMatch(/TEST_BOUNDARY_PRIOR_EVIDENCE_ACCEPTED/);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("stale/missing fresh pre-apply remains fail-closed when precondition gate enforces expiry", () => {
    // Precondition evidence is dry-run gate; apply pin publication must not waive expiry.
    const preGates = path.join(
      ROOT,
      "scripts/security/ra-pro-cutover-precondition-gates.ps1",
    );
    const evidencePath = path.join(
      ROOT,
      "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json",
    );
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-stale-"));
    try {
      const auth = readAuth();
      const stale = {
        ...auth,
        published_precondition_evidence: {
          ...auth.published_precondition_evidence,
          valid_until_utc: "2020-01-01T00:00:00Z",
        },
      };
      // Force gate to see expired evidence by rewriting fixture valid_until in a temp copy
      // while keeping SHA pin — expect SHA mismatch OR expiry fail-closed.
      const ev = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      ev.valid_until_utc = "2020-01-01T00:00:00Z";
      const staleEvPath = path.join(dir, "stale-pre.json");
      const body = `${JSON.stringify(ev, null, 2)}\n`;
      fs.writeFileSync(staleEvPath, body);
      const authPath = path.join(dir, "auth.json");
      // Pin SHA to the stale body so content gate reaches expiry check
      stale.required_precondition_evidence_sha256 = sha256(Buffer.from(body, "utf8"));
      fs.writeFileSync(authPath, `${JSON.stringify(stale, null, 2)}\n`);
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(preGates)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidence -Path ${psLiteral(staleEvPath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRECONDITION_EVIDENCE_EXPIRED|PRECONDITION_EVIDENCE/);
      expect(r.out).not.toMatch(/UNEXPECTED_ACCEPT/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
