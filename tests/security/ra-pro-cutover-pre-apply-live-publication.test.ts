/**
 * RA Pro pre-apply live-evidence pin publication regressions.
 * Tip fixture identity + gate accept/reject + harness stop-after-pre-apply.
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
  "scripts/security/ra-pro-cutover-pre-apply-live-gates.ps1",
);
const APPLY =
  "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1";
const FIXTURE_REL =
  "tests/security/helpers/fixtures/ra-pro-cutover-pre-apply-live-evidence.json";
const FIXTURE = path.join(ROOT, FIXTURE_REL);
const PIN =
  "98e8824b6a7137a893f3e12719e1fa5a1a39de6d69f3d6c19def821e6c1aea98";
const OID = "460f4e68b2e59d136115ba0ebcfa58f051a96b01";
const BYTES = 2309;
const REVIEWED_TIP = "a34ebaa58bd18352468967a9cbdda9177c63c36f";
const FREEZE = "a74d5108752d93e1ca4baa78f4dc7425120658b7";
const BUNDLE_SOURCE = "90af07d27e122d80d5fb5072f7a66da818f245a5";
const PRIOR_DRY =
  "9679678436659c64857c47397b5196343e11b8e3cc8277b7af0594a99b4f9a88";
const GATES_OID = "e4f5f67188f572654ad51fff14e1e949aaba58fb";
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
      $meta = Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(pathEvidence)} -Auth $auth
      Write-Output ('ACCEPTED:' + [string]$meta.sha256)
      exit 0
    } catch {
      Write-Output ([string]$_.Exception.Message)
      exit 1
    }
  `);
}

describe("RA Pro pre-apply live pin publication (static)", () => {
  it("tip auth publishes exact pre-apply pins; prior dry-run unchanged", () => {
    const auth = readAuth();
    expect(auth.published_pre_apply_live_evidence.status).toBe("PUBLISHED");
    expect(auth.required_pre_apply_live_evidence_sha256).toBe(PIN);
    expect(auth.required_pre_apply_live_freeze).toBe(FREEZE);
    expect(auth.required_pre_apply_live_evidence_tip).toBe(REVIEWED_TIP);
    expect(auth.required_pre_apply_live_bundle_source).toBe(BUNDLE_SOURCE);
    expect(auth.published_pre_apply_live_evidence.evidence_fixture_path).toBe(
      FIXTURE_REL,
    );
    expect(auth.published_pre_apply_live_evidence.evidence_bytes).toBe(BYTES);
    expect(auth.published_pre_apply_live_evidence.evidence_blob_oid).toBe(OID);
    expect(auth.published_pre_apply_live_evidence.evidence_line_endings).toBe("LF");
    expect(auth.published_pre_apply_live_evidence.protocol_id).toBe(
      "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
    );
    expect(auth.published_pre_apply_live_evidence.valid_from_utc).toBe(
      "2026-09-17T00:55:00Z",
    );
    expect(auth.published_pre_apply_live_evidence.valid_until_utc).toBe(
      "2026-09-18T00:55:00Z",
    );
    expect(auth.published_pre_apply_live_evidence.collection_started_at_utc).toBe(
      "2026-09-17T00:55:00Z",
    );
    expect(auth.published_pre_apply_live_evidence.collection_ended_at_utc).toBe(
      "2026-09-17T01:17:28Z",
    );
    expect(auth.published_pre_apply_live_evidence.materialization).toBe(
      "git_cat_file_tip_blob_only",
    );
    expect(auth.published_pre_apply_live_evidence.operator_path_override_forbidden).toBe(
      true,
    );
    expect(auth.published_pre_apply_live_evidence.apply_authorization_embedded).toBe(
      false,
    );
    expect(auth.published_prior_dry_run.status).toBe("PUBLISHED");
    expect(auth.published_prior_dry_run.evidence_sha256).toBe(PRIOR_DRY);
    expect(auth.authorized_pr_head).toBe(FREEZE);
    expect(auth.bundle_source_commit).toBe(BUNDLE_SOURCE);
    expect(auth.pre_apply_live_gates.oid).toBe(GATES_OID);
    expect(JSON.stringify(auth)).not.toMatch(FORBIDDEN);
  });

  it("committed evidence blob is exact LF pin identity", () => {
    const buf = fs.readFileSync(FIXTURE);
    expect(buf.length).toBe(BYTES);
    expect(buf.includes(0x0d)).toBe(false);
    expect(buf[buf.length - 1]).toBe(0x0a);
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
    const hashOid = execFileSync("git", ["hash-object", "--no-filters", FIXTURE_REL], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    expect(hashOid).toBe(OID);
    const ga = fs.readFileSync(path.join(ROOT, ".gitattributes"), "utf8");
    expect(ga).toMatch(
      /ra-pro-cutover-pre-apply-live-evidence\.json\s+text eol=lf/,
    );
  });

  it("unchanged freeze/source/migration/decision/bundle/contract/prior authorities", () => {
    const auth = readAuth();
    expect(auth.authorized_pr_head).toBe(FREEZE);
    expect(auth.bundle_source_commit).toBe(BUNDLE_SOURCE);
    expect(auth.migration_blob_oid).toBe(
      "d36f5e2c50f7bab956c3191723c0e8a223279df5",
    );
    expect(auth.decision_blob_oid).toBe(
      "0dd39de5ffbfd2b35d3d73887dd0fa915a061c93",
    );
    expect(auth.standalone_bundle.oid).toBe(
      "7d6fda19b42c0ac12dfdc6f12e81acfcf6108592",
    );
    expect(auth.pre_apply_live_evidence_protocol.contract_oid).toBe(
      "cb0a50d745e78c36505244d4068967eba1f9bf33",
    );
    expect(auth.published_prior_dry_run.evidence_sha256).toBe(PRIOR_DRY);
    expect(auth.operator_apply_ceremony.oid).toBe(
      "ce2dff024a764300180983e75ed3293c44b6bcf0",
    );
    expect(auth.visible_ceremony_entry.oid).toBe(
      "907990538f0e1baacd0505719fcd20d3d3d808e4",
    );
    expect(auth.pre_apply_live_gates.oid).toBe(GATES_OID);
  });
});

describe.skipIf(!isWin)("RA Pro pre-apply live publication gates + apply boundary (Windows)", () => {
  it("exact fixture accepted; fail-closed derivatives reject before credentials", () => {
    const auth = readAuth();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-pub-"));
    try {
      const authPath = path.join(dir, "auth.json");
      fs.writeFileSync(authPath, `${JSON.stringify(auth, null, 2)}\n`);

      const ok = assertEvidence(FIXTURE, authPath);
      expect(ok.status).toBe(0);
      expect(ok.out).toMatch(new RegExp(`ACCEPTED:${PIN}`));

      // CRLF
      const crlfPath = path.join(dir, "crlf.json");
      fs.writeFileSync(
        crlfPath,
        Buffer.from(fs.readFileSync(FIXTURE).toString("utf8").replace(/\n/g, "\r\n")),
      );
      expect(assertEvidence(crlfPath, authPath).out).toMatch(/SHA_MISMATCH/);

      // tampered SHA pin
      const tamperAuth = {
        ...auth,
        required_pre_apply_live_evidence_sha256: "0".repeat(64),
      };
      const tamperAuthPath = path.join(dir, "tamper-auth.json");
      fs.writeFileSync(tamperAuthPath, `${JSON.stringify(tamperAuth, null, 2)}\n`);
      expect(assertEvidence(FIXTURE, tamperAuthPath).out).toMatch(/SHA_MISMATCH/);

      // missing
      expect(assertEvidence(path.join(dir, "missing.json"), authPath).out).toMatch(
        /MISSING|REPARSE|SHA_MISMATCH/,
      );

      // future valid_from
      const future = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
      future.valid_from_utc = "2099-01-01T00:00:00Z";
      future.valid_until_utc = "2099-12-31T23:59:59Z";
      future.collection_started_at_utc = "2099-06-01T10:00:00Z";
      future.collection_ended_at_utc = "2099-06-01T11:00:00Z";
      future.serving_deployment.observed_at_utc = "2099-06-01T10:30:00Z";
      future.stripe_tcp1.visibility_window_start_utc = "2099-05-31T10:30:00Z";
      future.stripe_tcp1.visibility_window_end_utc = "2099-06-01T10:30:00Z";
      future.database_readonly.relevant_activity_window_start_utc = "2099-06-01T00:00:00Z";
      future.database_readonly.relevant_activity_window_end_utc = "2099-06-01T11:00:00Z";
      const futureBody = `${JSON.stringify(future, null, 2)}\n`;
      const futurePath = path.join(dir, "future.json");
      fs.writeFileSync(futurePath, futureBody);
      const futureAuth = {
        ...auth,
        required_pre_apply_live_evidence_sha256: sha256(Buffer.from(futureBody, "utf8")),
      };
      const futureAuthPath = path.join(dir, "future-auth.json");
      fs.writeFileSync(futureAuthPath, `${JSON.stringify(futureAuth, null, 2)}\n`);
      expect(assertEvidence(futurePath, futureAuthPath).out).toMatch(
        /START_NOT_UNEXPIRED/,
      );

      // expired
      const expired = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
      expired.valid_from_utc = "2020-01-01T00:00:00Z";
      expired.valid_until_utc = "2020-01-02T00:00:00Z";
      expired.collection_started_at_utc = "2020-01-01T10:00:00Z";
      expired.collection_ended_at_utc = "2020-01-01T11:00:00Z";
      expired.serving_deployment.observed_at_utc = "2020-01-01T10:30:00Z";
      expired.stripe_tcp1.visibility_window_start_utc = "2019-12-31T10:30:00Z";
      expired.stripe_tcp1.visibility_window_end_utc = "2020-01-01T10:30:00Z";
      expired.database_readonly.relevant_activity_window_end_utc = "2020-01-01T11:00:00Z";
      const expiredBody = `${JSON.stringify(expired, null, 2)}\n`;
      const expiredPath = path.join(dir, "expired.json");
      fs.writeFileSync(expiredPath, expiredBody);
      const expiredAuth = {
        ...auth,
        required_pre_apply_live_evidence_sha256: sha256(Buffer.from(expiredBody, "utf8")),
      };
      const expiredAuthPath = path.join(dir, "expired-auth.json");
      fs.writeFileSync(expiredAuthPath, `${JSON.stringify(expiredAuth, null, 2)}\n`);
      expect(assertEvidence(expiredPath, expiredAuthPath).out).toMatch(
        /EXPIRED|START_NOT_UNEXPIRED/,
      );

      // protocol substitute (precondition fixture)
      const pre = path.join(
        ROOT,
        "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json",
      );
      const preBody = fs.readFileSync(pre);
      const preAuth = {
        ...auth,
        required_pre_apply_live_evidence_sha256: sha256(preBody),
      };
      const preAuthPath = path.join(dir, "pre-auth.json");
      fs.writeFileSync(preAuthPath, `${JSON.stringify(preAuth, null, 2)}\n`);
      expect(assertEvidence(pre, preAuthPath).out).toMatch(/SUBSTITUTION_FORBIDDEN/);

      // open gate / protection / inventory / ledger
      for (const [name, mutate, code] of [
        [
          "open",
          (e: any) => {
            e.commerce_gate.observed = "open";
          },
          /COMMERCE_GATE/,
        ],
        [
          "prot",
          (e: any) => {
            e.protection.custom_domains_public = false;
          },
          /PROTECTION/,
        ],
        [
          "inv",
          (e: any) => {
            e.database_readonly.ceremony_inventory.total = 5;
          },
          /INVENTORY|CONTRADICTION/,
        ],
        [
          "led",
          (e: any) => {
            e.database_readonly.webhook_ledger_non_terminal_count = 1;
          },
          /LEDGER/,
        ],
      ] as const) {
        const e = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
        mutate(e);
        const body = `${JSON.stringify(e, null, 2)}\n`;
        const p = path.join(dir, `${name}.json`);
        fs.writeFileSync(p, body);
        const a = {
          ...auth,
          required_pre_apply_live_evidence_sha256: sha256(Buffer.from(body, "utf8")),
        };
        const ap = path.join(dir, `${name}-auth.json`);
        fs.writeFileSync(ap, `${JSON.stringify(a, null, 2)}\n`);
        expect(assertEvidence(p, ap).out, name).toMatch(code);
      }

      // unpublished pins
      const unpub = {
        ...auth,
        required_pre_apply_live_evidence_sha256: null,
        required_pre_apply_live_freeze: null,
        required_pre_apply_live_evidence_tip: null,
        required_pre_apply_live_bundle_source: null,
        published_pre_apply_live_evidence: { status: "UNPUBLISHED" },
      };
      const unpubPath = path.join(dir, "unpub-auth.json");
      fs.writeFileSync(unpubPath, `${JSON.stringify(unpub, null, 2)}\n`);
      const unpubR = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(unpubPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreApplyLiveEvidencePublished -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]$_.Exception.Message)
          exit 1
        }
      `);
      expect(unpubR.out).toMatch(/PRE_APPLY_LIVE_PINS_UNPUBLISHED/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("apply ceremony tip-materializes prior + pre-apply then stops before SecureString/Node/DB", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-pub-boundary-"));
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
            RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRE_APPLY_LIVE: "1",
          },
        },
      );
      const combined = String(r.stdout || "") + String(r.stderr || "");
      expect(combined).toMatch(
        /TEST_BOUNDARY_PRE_APPLY_LIVE_ACCEPTED|TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE/,
      );
      expect(combined).not.toMatch(/PROMPT_READY/);
      const summaryPath = path.join(outDir, "PRODUCTION_APPLY_SUMMARY.json");
      expect(fs.existsSync(summaryPath)).toBe(true);
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      expect(summary.result_code).toBe("TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE");
      expect(summary.prior_dry_run_evidence_sha256).toBe(PRIOR_DRY);
      expect(summary.pre_apply_live_evidence_sha256).toBe(PIN);
      expect(summary.databaseConnectionAttempts ?? 0).toBe(0);
      expect(summary.sqlApplicationAttempts ?? 0).toBe(0);
      expect(JSON.stringify(summary)).not.toMatch(FORBIDDEN);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("path/env pre-apply evidence overrides remain forbidden under published pins", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-override-"));
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
          "-PreApplyLiveEvidencePath",
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
            RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRE_APPLY_LIVE: "1",
          },
        },
      );
      const combined = String(r.stdout || "") + String(r.stderr || "");
      expect(combined).toMatch(
        /PRE_APPLY_LIVE_EVIDENCE_PATH_OVERRIDE_FORBIDDEN|PRE_APPLY_LIVE/,
      );
      expect(combined).not.toMatch(/TEST_BOUNDARY_PRE_APPLY_LIVE_ACCEPTED/);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });
});
