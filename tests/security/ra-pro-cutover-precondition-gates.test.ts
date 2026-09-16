/**
 * RA Pro fresh-precondition evidence gate regressions.
 * Synthetic local fixture only — no DB, no credentials, no production contact.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const GATES = path.join(
  ROOT,
  "scripts/security/ra-pro-cutover-precondition-gates.ps1",
);
const CONTRACT = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/PRECONDITION_EVIDENCE_CONTRACT.json",
);
const FIXTURE = path.join(
  ROOT,
  "tests/security/helpers/fixtures/ra-pro-precondition-evidence.synthetic.json",
);
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
);
const MERGE_BASE = "19e8bd071bae5f8afed85340f50168d4ca8e5586";
const isWin = process.platform === "win32";

function systemPowerShell(): string {
  return path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

function sha256Bytes(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function readFixture(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
}

function writePair(
  dir: string,
  evidence: Record<string, unknown>,
  pinOverrides: Record<string, unknown> = {},
) {
  const evidencePath = path.join(dir, "precondition-evidence.json");
  const body = `${JSON.stringify(evidence, null, 2)}\n`;
  fs.writeFileSync(evidencePath, body, "utf8");
  const sha = sha256Bytes(Buffer.from(body, "utf8"));
  const tipAuth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
  const auth = {
    ...tipAuth,
    required_precondition_evidence_sha256: sha,
    required_precondition_freeze: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    required_precondition_evidence_tip: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    required_precondition_bundle_source: "cccccccccccccccccccccccccccccccccccccccc",
    published_precondition_evidence: { status: "PUBLISHED" },
    ...pinOverrides,
  };
  const authPath = path.join(dir, "auth-with-precondition-pins.json");
  fs.writeFileSync(authPath, `${JSON.stringify(auth, null, 2)}\n`, "utf8");
  return { evidencePath, authPath, sha, body };
}

function runPs(script: string): { status: number | null; out: string } {
  const r = spawnSync(
    systemPowerShell(),
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 60000 },
  );
  return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
}

function psLiteral(p: string): string {
  return "'" + p.replace(/'/g, "''") + "'";
}

describe("RA Pro precondition evidence contract + synthetic fixture", () => {
  it("contract documents protocol and fail-closed conditions", () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
    expect(contract.protocol_id).toBe("RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1");
    expect(contract.schema_version).toBe(1);
    expect(contract.example_shape.gate_aware_production_deployment.merge_base_ref).toBe(
      MERGE_BASE,
    );
    expect(contract.example_shape.ceremony_inventory).toEqual({
      total: 4,
      company_owned: 3,
      firm_owned: 1,
      classification: "active_and_complimentary",
    });
    expect(Array.isArray(contract.fail_closed_conditions)).toBe(true);
    expect(contract.fail_closed_conditions.join("\n")).toMatch(/PRECONDITION_PINS_UNPUBLISHED/);
    expect(contract.fail_closed_conditions.join("\n")).toMatch(/PRECONDITION_EVIDENCE_SHA_MISMATCH/);
    expect(fs.readFileSync(CONTRACT).includes(0x0d)).toBe(false);
  });

  it("synthetic fixture matches required schema shape", () => {
    const ev = readFixture();
    expect(ev.protocol_id).toBe("RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1");
    expect(ev.schema_version).toBe(1);
    expect((ev.gate_aware_production_deployment as { deployment_id_or_url_identity: string })
      .deployment_id_or_url_identity).toBe("synthetic-gate-aware-deploy-0001");
    expect((ev.gate_aware_production_deployment as { merge_base_ref: string }).merge_base_ref).toBe(
      MERGE_BASE,
    );
    expect((ev.commerce_gate as { observed: string; never_open: boolean }).observed).toBe(
      "closed",
    );
    expect((ev.commerce_gate as { never_open: boolean }).never_open).toBe(true);
    expect(ev.ceremony_inventory).toEqual({
      total: 4,
      company_owned: 3,
      firm_owned: 1,
      classification: "active_and_complimentary",
    });
    expect((ev.migration_state as { history_count_expected: number }).history_count_expected).toBe(
      187,
    );
    expect((ev.migration_state as { objects_absent: boolean }).objects_absent).toBe(true);
    expect(ev.delta_since_decision).toEqual({
      unexpected_links: 0,
      new_authorizing_slots: 0,
    });
    expect(String(ev.valid_until_utc)).toMatch(/^2099-/);
    const blob = JSON.stringify(ev);
    expect(blob).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(blob).not.toMatch(/cus_|sub_|evt_/i);
    expect(blob).not.toMatch(/postgres(ql)?:\/\/[^:]+:[^@]+@/i);
    expect(fs.readFileSync(FIXTURE).includes(0x0d)).toBe(false);
  });

  it("tip authorization publishes precondition pins against reviewed tip 52fbbfcf", () => {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    expect(auth.required_precondition_evidence_sha256).toBe(
      "fb3625f99027c600c1b1280f103df723b4fbff56ee21c60a3c8ed6e2789a7cd3",
    );
    expect(auth.required_precondition_freeze).toBe(
      "a74d5108752d93e1ca4baa78f4dc7425120658b7",
    );
    expect(auth.required_precondition_evidence_tip).toBe(
      "52fbbfcfc16e88a5862df6cd363823f40ac06ff4",
    );
    expect(auth.required_precondition_bundle_source).toBe(
      "90af07d27e122d80d5fb5072f7a66da818f245a5",
    );
    expect(auth.published_precondition_evidence?.status).toBe("PUBLISHED");
    expect(auth.published_prior_dry_run?.status).toBe("UNPUBLISHED");
    expect(auth.required_prior_dry_run_evidence_sha256).toBeNull();
  });

  it("committed precondition evidence fixture matches pinned SHA/bytes/LF", () => {
    const rel =
      "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json";
    const buf = fs.readFileSync(path.join(ROOT, rel));
    expect(buf.includes(0x0d)).toBe(false);
    expect(buf[buf.length - 1]).toBe(0x0a);
    expect(buf.length).toBe(1407);
    expect(sha256Bytes(buf)).toBe(
      "fb3625f99027c600c1b1280f103df723b4fbff56ee21c60a3c8ed6e2789a7cd3",
    );
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    expect(auth.published_precondition_evidence.evidence_fixture_path).toBe(rel);
    expect(auth.published_precondition_evidence.evidence_bytes).toBe(1407);
    expect(auth.required_precondition_evidence_sha256).toBe(sha256Bytes(buf));
    const text = buf.toString("utf8");
    expect(text).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(text).not.toMatch(/\b(cus_|sub_|evt_|sk_live_|whsec_)/i);
    expect(text).not.toMatch(/postgres(ql)?:\/\/[^:]+:[^@]+@/i);
  });
});

describe.skipIf(!isWin)("RA Pro Assert-RaProPreconditionEvidence* (Windows)", () => {
  it("unpublished disposable auth fails Assert-RaProPreconditionEvidencePublished", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-unpub-"));
    try {
      const tipAuth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
      const unpublished = {
        ...tipAuth,
        required_precondition_evidence_sha256: null,
        required_precondition_freeze: null,
        required_precondition_evidence_tip: null,
        required_precondition_bundle_source: null,
        published_precondition_evidence: { status: "UNPUBLISHED" },
      };
      const authPath = path.join(dir, "auth-unpublished.json");
      fs.writeFileSync(authPath, `${JSON.stringify(unpublished, null, 2)}\n`, "utf8");
      const gatesEsc = psLiteral(GATES);
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${gatesEsc}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidencePublished -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRECONDITION_PINS_UNPUBLISHED/);
      expect(r.out).not.toMatch(/UNEXPECTED_ACCEPT/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("published tip auth accepts committed precondition evidence before expiry", () => {
    const evidencePath = path.join(
      ROOT,
      "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json",
    );
    const r = runPs(`
      $ErrorActionPreference = 'Stop'
      . ${psLiteral(GATES)}
      $auth = Get-Content -LiteralPath ${psLiteral(AUTH_PATH)} -Raw -Encoding UTF8 | ConvertFrom-Json
      $meta = Assert-RaProPreconditionEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
      Write-Output ('ACCEPTED:' + [string]$meta.sha256)
    `);
    expect(r.status).toBe(0);
    expect(r.out).toContain(
      "ACCEPTED:fb3625f99027c600c1b1280f103df723b4fbff56ee21c60a3c8ed6e2789a7cd3",
    );
  });

  it("rejects CRLF rewrite and external substitute against tip pins", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-sub-"));
    try {
      const original = fs.readFileSync(
        path.join(
          ROOT,
          "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json",
        ),
      );
      const crlfPath = path.join(dir, "crlf.json");
      fs.writeFileSync(crlfPath, original.toString("utf8").replace(/\n/g, "\r\n"));
      const r1 = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(AUTH_PATH)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidence -Path ${psLiteral(crlfPath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r1.status).toBe(1);
      expect(r1.out).toMatch(/PRECONDITION_EVIDENCE_SHA_MISMATCH/);

      const subst = JSON.parse(original.toString("utf8"));
      subst.source_channel_classification = "EXTERNAL_SUBSTITUTE_SHOULD_FAIL";
      const substPath = path.join(dir, "subst.json");
      fs.writeFileSync(substPath, `${JSON.stringify(subst, null, 2)}\n`);
      const r2 = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(AUTH_PATH)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidence -Path ${psLiteral(substPath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r2.status).toBe(1);
      expect(r2.out).toMatch(/PRECONDITION_EVIDENCE_SHA_MISMATCH/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("dry-run ceremony source forbids env evidence path override when published", () => {
    const ceremony = fs.readFileSync(
      path.join(
        ROOT,
        "scripts/security/operator-ra-pro-cutover-production-dryrun-ceremony.ps1",
      ),
      "utf8",
    );
    expect(ceremony).toMatch(/PRECONDITION_EVIDENCE_PATH_OVERRIDE_FORBIDDEN/);
    expect(ceremony).toMatch(/cat-file blob \$\{tip\}:\$precondRel/);
    expect(ceremony).not.toMatch(
      /RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_PATH required when precondition pins are published/,
    );
  });

  it("synthetic fixture passes when disposable pins are published", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-ok-"));
    try {
      const { evidencePath, authPath, sha } = writePair(dir, readFixture());
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        $meta = Assert-RaProPreconditionEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
        Write-Output ('ACCEPTED:' + [string]$meta.sha256)
      `);
      expect(r.status).toBe(0);
      expect(r.out).toContain(`ACCEPTED:${sha}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects tampered hash", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-hash-"));
    try {
      const { evidencePath, authPath } = writePair(dir, readFixture(), {
        required_precondition_evidence_sha256: "0".repeat(64),
      });
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRECONDITION_EVIDENCE_SHA_MISMATCH/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects stale expiry", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-exp-"));
    try {
      const stale = {
        ...readFixture(),
        collected_at_utc: "2020-01-02T00:00:00Z",
        valid_from_utc: "2020-01-01T00:00:00Z",
        valid_until_utc: "2020-01-03T00:00:00Z",
        gate_aware_production_deployment: {
          ...(readFixture().gate_aware_production_deployment as object),
          observed_at_utc: "2020-01-01T12:00:00Z",
        },
      };
      const { evidencePath, authPath } = writePair(dir, stale);
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRECONDITION_EVIDENCE_EXPIRED/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects wrong inventory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-inv-"));
    try {
      const bad = {
        ...readFixture(),
        ceremony_inventory: {
          total: 5,
          company_owned: 3,
          firm_owned: 1,
          classification: "active_and_complimentary",
        },
      };
      const { evidencePath, authPath } = writePair(dir, bad);
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRECONDITION_EVIDENCE_INVENTORY/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects open commerce gate", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-gate-"));
    try {
      const bad = {
        ...readFixture(),
        commerce_gate: {
          observed: "open",
          never_open: true,
          observed_at_utc: "2099-01-01T12:30:00Z",
        },
      };
      const { evidencePath, authPath } = writePair(dir, bad);
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRECONDITION_EVIDENCE_COMMERCE_GATE/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects wrong merge base", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pre-mb-"));
    try {
      const bad = {
        ...readFixture(),
        gate_aware_production_deployment: {
          deployment_id_or_url_identity: "synthetic-gate-aware-deploy-0001",
          merge_base_ref: "ffffffffffffffffffffffffffffffffffffffff",
          observed_at_utc: "2099-01-01T12:00:00Z",
        },
      };
      const { evidencePath, authPath } = writePair(dir, bad);
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreconditionEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRECONDITION_EVIDENCE_MERGE_BASE/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
