/**
 * RA Pro fresh pre-apply live-evidence gate regressions.
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
  "scripts/security/ra-pro-cutover-pre-apply-live-gates.ps1",
);
const CONTRACT = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json",
);
const FIXTURE = path.join(
  ROOT,
  "tests/security/helpers/fixtures/ra-pro-pre-apply-live-evidence.synthetic.json",
);
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
);
const APPLY = "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1";
const FREEZE = "a74d5108752d93e1ca4baa78f4dc7425120658b7";
const MERGE_BASE = "19e8bd071bae5f8afed85340f50168d4ca8e5586";
const PRECONDITION_FIXTURE = path.join(
  ROOT,
  "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json",
);
const PRIOR_FIXTURE = path.join(
  ROOT,
  "tests/security/helpers/fixtures/ra-pro-cutover-prior-production-dry-run-evidence.json",
);
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
  const evidencePath = path.join(dir, "pre-apply-live-evidence.json");
  const body = `${JSON.stringify(evidence, null, 2)}\n`;
  fs.writeFileSync(evidencePath, body, "utf8");
  const sha = sha256Bytes(Buffer.from(body, "utf8"));
  const tipAuth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
  const auth = {
    ...tipAuth,
    required_pre_apply_live_evidence_sha256: sha,
    required_pre_apply_live_freeze: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    required_pre_apply_live_evidence_tip: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    required_pre_apply_live_bundle_source: "cccccccccccccccccccccccccccccccccccccccc",
    published_pre_apply_live_evidence: { status: "PUBLISHED" },
    ...pinOverrides,
  };
  const authPath = path.join(dir, "auth-with-pre-apply-pins.json");
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

describe("RA Pro pre-apply live evidence contract + tip auth + synthetic fixture", () => {
  it("tip auth pins are null/UNPUBLISHED", () => {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    expect(auth.required_pre_apply_live_evidence_sha256).toBeNull();
    expect(auth.required_pre_apply_live_freeze).toBeNull();
    expect(auth.required_pre_apply_live_evidence_tip).toBeNull();
    expect(auth.required_pre_apply_live_bundle_source).toBeNull();
    expect(auth.published_pre_apply_live_evidence?.status).toBe("UNPUBLISHED");
    expect(auth.published_prior_dry_run?.status).toBe("PUBLISHED");
    expect(auth.pre_apply_live_evidence_protocol?.id).toBe(
      "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
    );
    expect(auth.pre_apply_live_gates?.path).toBe(
      "scripts/security/ra-pro-cutover-pre-apply-live-gates.ps1",
    );
  });

  it("contract documents protocol and fail-closed codes", () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
    expect(contract.protocol_id).toBe("RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1");
    expect(contract.schema_version).toBe(1);
    expect(contract.protocol_id).not.toBe("RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1");
    const codes = contract.fail_closed_conditions.join("\n");
    expect(codes).toMatch(/PRE_APPLY_LIVE_PINS_UNPUBLISHED/);
    expect(codes).toMatch(/PRE_APPLY_LIVE_EVIDENCE_SHA_MISMATCH/);
    expect(codes).toMatch(/PRE_APPLY_LIVE_EVIDENCE_SUBSTITUTION_FORBIDDEN/);
    expect(codes).toMatch(/PRE_APPLY_LIVE_EVIDENCE_START_NOT_UNEXPIRED/);
    expect(fs.readFileSync(CONTRACT).includes(0x0d)).toBe(false);
  });

  it("synthetic fixture matches required schema shape", () => {
    const ev = readFixture();
    expect(ev.protocol_id).toBe("RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1");
    expect(ev.schema_version).toBe(1);
    expect(String(ev.valid_from_utc)).toMatch(/^2026-01-01/);
    expect(String(ev.valid_until_utc)).toMatch(/^2099-/);
    expect(
      (ev.serving_deployment as { merge_base_ref: string }).merge_base_ref,
    ).toBe(MERGE_BASE);
    expect(
      (ev.serving_deployment as { merge_contained_or_serving: boolean })
        .merge_contained_or_serving,
    ).toBe(true);
    expect((ev.commerce_gate as { observed: string }).observed).toBe("closed");
    expect((ev.commerce_gate as { never_open: boolean }).never_open).toBe(true);
    expect(ev.protection).toEqual({
      generated_production_preview_urls_protected: true,
      old_pre_gate_url_protected: true,
      custom_domains_public: true,
    });
    expect(
      (ev.stripe_tcp1 as { events_allowlist: string[] }).events_allowlist,
    ).toEqual(["checkout.session.completed"]);
    expect(
      (ev.stripe_tcp1 as { failed_visible_count: number }).failed_visible_count,
    ).toBe(0);
    expect(
      (ev.stripe_tcp1 as { pending_or_retry_scheduled_visible_count: number })
        .pending_or_retry_scheduled_visible_count,
    ).toBe(0);
    const db = ev.database_readonly as Record<string, unknown>;
    expect(db.history_count_expected).toBe(187);
    expect(db.target_version_absent).toBe("20260915004500");
    expect(db.migration_objects_absent).toBe(true);
    expect(db.billing_company_id_absent).toBe(true);
    expect(db.linked_firms_count).toBe(0);
    expect(db.ceremony_inventory).toEqual({
      total: 4,
      company_owned: 3,
      firm_owned: 1,
      classification: "active_and_complimentary",
    });
    expect(db.unexpected_new_links).toBe(0);
    expect(db.unexpected_new_authorizing_slots).toBe(0);
    expect(db.webhook_ledger_non_terminal_count).toBe(0);
    const blob = JSON.stringify(ev);
    expect(blob).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(blob).not.toMatch(/cus_|sub_|evt_/i);
    expect(blob).not.toMatch(/postgres(ql)?:\/\/[^:]+:[^@]+@/i);
    expect(fs.readFileSync(FIXTURE).includes(0x0d)).toBe(false);
  });
});

describe.skipIf(!isWin)("RA Pro Assert-RaProPreApplyLiveEvidence* (Windows)", () => {
  it("unpublished tip Auth fails Assert-RaProPreApplyLiveEvidencePublished", () => {
    const r = runPs(`
      $ErrorActionPreference = 'Stop'
      . ${psLiteral(GATES)}
      $auth = Get-Content -LiteralPath ${psLiteral(AUTH_PATH)} -Raw -Encoding UTF8 | ConvertFrom-Json
      try {
        Assert-RaProPreApplyLiveEvidencePublished -Auth $auth
        Write-Output 'UNEXPECTED_ACCEPT'
        exit 0
      } catch {
        Write-Output ([string]\$_.Exception.Message)
        exit 1
      }
    `);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/PRE_APPLY_LIVE_PINS_UNPUBLISHED/);
    expect(r.out).not.toMatch(/UNEXPECTED_ACCEPT/);
  });

  it("disposable published pins + synthetic fixture accepts Assert", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-ok-"));
    try {
      const { evidencePath, authPath, sha } = writePair(dir, readFixture());
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        $meta = Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
        Write-Output ('ACCEPTED:' + [string]$meta.sha256)
      `);
      expect(r.status).toBe(0);
      expect(r.out).toContain(`ACCEPTED:${sha}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("retained collected artifact accepts while currently valid (disposable pins)", () => {
    const retained = path.join(
      ROOT,
      ".local/ra-pro-cutover-pre-apply-live-evidence/RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1.json",
    );
    expect(fs.existsSync(retained)).toBe(true);
    const buf = fs.readFileSync(retained);
    expect(buf.includes(0x0d)).toBe(false);
    expect(buf[buf.length - 1]).toBe(0x0a);
    const sha = sha256Bytes(buf);
    expect(sha).toBe(
      "98e8824b6a7137a893f3e12719e1fa5a1a39de6d69f3d6c19def821e6c1aea98",
    );
    expect(buf.length).toBe(2309);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-retained-"));
    try {
      const tipAuth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
      const authPath = path.join(dir, "auth.json");
      fs.writeFileSync(
        authPath,
        `${JSON.stringify(
          {
            ...tipAuth,
            required_pre_apply_live_evidence_sha256: sha,
            required_pre_apply_live_freeze: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            required_pre_apply_live_evidence_tip: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            required_pre_apply_live_bundle_source: "cccccccccccccccccccccccccccccccccccccccc",
            published_pre_apply_live_evidence: { status: "PUBLISHED" },
          },
          null,
          2,
        )}\n`,
      );
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        $meta = Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(retained)} -Auth $auth
        Write-Output ('ACCEPTED:' + [string]$meta.sha256)
      `);
      expect(r.status).toBe(0);
      expect(r.out).toContain(`ACCEPTED:${sha}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects future valid_from_utc with PRE_APPLY_LIVE_EVIDENCE_START_NOT_UNEXPIRED", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-future-from-"));
    try {
      const future = {
        ...readFixture(),
        collection_started_at_utc: "2099-06-01T10:00:00Z",
        collection_ended_at_utc: "2099-06-01T11:00:00Z",
        valid_from_utc: "2099-01-01T00:00:00Z",
        valid_until_utc: "2099-12-31T23:59:59Z",
        serving_deployment: {
          ...(readFixture().serving_deployment as object),
          observed_at_utc: "2099-06-01T10:30:00Z",
        },
        stripe_tcp1: {
          ...(readFixture().stripe_tcp1 as object),
          visibility_window_start_utc: "2099-05-31T10:30:00Z",
          visibility_window_end_utc: "2099-06-01T10:30:00Z",
        },
        database_readonly: {
          ...(readFixture().database_readonly as object),
          relevant_activity_window_start_utc: "2099-06-01T00:00:00Z",
          relevant_activity_window_end_utc: "2099-06-01T11:00:00Z",
        },
      };
      const { evidencePath, authPath } = writePair(dir, future);
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRE_APPLY_LIVE_EVIDENCE_START_NOT_UNEXPIRED/);
      expect(r.out).toMatch(/valid_from_utc is after UtcNow/);
      expect(r.out).not.toMatch(/UNEXPECTED_ACCEPT/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects missing path", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-miss-"));
    try {
      const { authPath } = writePair(dir, readFixture());
      const missing = path.join(dir, "no-such.json");
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(missing)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRE_APPLY_LIVE_EVIDENCE_MISSING/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects tampered hash / CRLF rewrite / wrong tip pin / external substitute", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-tamper-"));
    try {
      const { evidencePath, authPath, body } = writePair(dir, readFixture());

      const rHash = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        $auth.required_pre_apply_live_evidence_sha256 = '${"0".repeat(64)}'
        try {
          Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(rHash.status).toBe(1);
      expect(rHash.out).toMatch(/PRE_APPLY_LIVE_EVIDENCE_SHA_MISMATCH/);

      const crlfPath = path.join(dir, "crlf.json");
      fs.writeFileSync(crlfPath, body.replace(/\n/g, "\r\n"));
      const rCrlf = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(crlfPath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(rCrlf.status).toBe(1);
      expect(rCrlf.out).toMatch(/PRE_APPLY_LIVE_EVIDENCE_SHA_MISMATCH/);

      const subst = { ...readFixture(), source_channel_classification: "EXTERNAL_SUBSTITUTE" };
      const substPath = path.join(dir, "subst.json");
      fs.writeFileSync(substPath, `${JSON.stringify(subst, null, 2)}\n`);
      const rSub = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(substPath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(rSub.status).toBe(1);
      expect(rSub.out).toMatch(/PRE_APPLY_LIVE_EVIDENCE_SHA_MISMATCH/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects stale/expired valid_until", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-exp-"));
    try {
      const stale = {
        ...readFixture(),
        collection_started_at_utc: "2020-01-01T10:00:00Z",
        collection_ended_at_utc: "2020-01-01T11:00:00Z",
        valid_from_utc: "2020-01-01T00:00:00Z",
        valid_until_utc: "2020-01-02T00:00:00Z",
        serving_deployment: {
          ...(readFixture().serving_deployment as object),
          observed_at_utc: "2020-01-01T10:30:00Z",
        },
      };
      const { evidencePath, authPath } = writePair(dir, stale);
      const r = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/PRE_APPLY_LIVE_EVIDENCE_EXPIRED|START_NOT_UNEXPIRED/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects historical precondition and prior-dry-run as substitution", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-subst-"));
    try {
      const pre = JSON.parse(fs.readFileSync(PRECONDITION_FIXTURE, "utf8"));
      const { evidencePath: prePath, authPath: preAuth } = writePair(dir, {
        ...pre,
        valid_until_utc: "2099-12-31T23:59:59Z",
        valid_from_utc: "2099-01-01T00:00:00Z",
        collected_at_utc: "2099-01-02T00:00:00Z",
      });
      // rewrite SHA for rewritten body already done by writePair
      const r1 = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(preAuth)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(prePath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r1.status).toBe(1);
      expect(r1.out).toMatch(
        /PRE_APPLY_LIVE_EVIDENCE_SUBSTITUTION_FORBIDDEN|PRE_APPLY_LIVE_EVIDENCE_PROTOCOL/,
      );

      const priorBuf = fs.readFileSync(PRIOR_FIXTURE);
      const priorPath = path.join(dir, "prior.json");
      fs.writeFileSync(priorPath, priorBuf);
      const priorSha = sha256Bytes(priorBuf);
      const tipAuth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
      const priorAuthPath = path.join(dir, "prior-auth.json");
      fs.writeFileSync(
        priorAuthPath,
        `${JSON.stringify(
          {
            ...tipAuth,
            required_pre_apply_live_evidence_sha256: priorSha,
            required_pre_apply_live_freeze: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            required_pre_apply_live_evidence_tip: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            required_pre_apply_live_bundle_source: "cccccccccccccccccccccccccccccccccccccccc",
            published_pre_apply_live_evidence: { status: "PUBLISHED" },
          },
          null,
          2,
        )}\n`,
      );
      const r2 = runPs(`
        $ErrorActionPreference = 'Stop'
        . ${psLiteral(GATES)}
        $auth = Get-Content -LiteralPath ${psLiteral(priorAuthPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
        try {
          Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(priorPath)} -Auth $auth
          Write-Output 'UNEXPECTED_ACCEPT'
          exit 0
        } catch {
          Write-Output ([string]\$_.Exception.Message)
          exit 1
        }
      `);
      expect(r2.status).toBe(1);
      expect(r2.out).toMatch(
        /PRE_APPLY_LIVE_EVIDENCE_SUBSTITUTION_FORBIDDEN|PRE_APPLY_LIVE_EVIDENCE_PROTOCOL|PRE_APPLY_LIVE_EVIDENCE_FORBIDDEN_CONTENT/,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects open gate, unprotected old URL, nonzero Failed/Pending, inventory/history/ledger drift", () => {
    const cases: Array<{
      name: string;
      mutate: (ev: Record<string, unknown>) => void;
      code: RegExp;
    }> = [
      {
        name: "open-gate",
        mutate: (ev) => {
          (ev.commerce_gate as { observed: string }).observed = "open";
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_COMMERCE_GATE/,
      },
      {
        name: "unprotected-old",
        mutate: (ev) => {
          (ev.protection as { old_pre_gate_url_protected: boolean }).old_pre_gate_url_protected =
            false;
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_PROTECTION/,
      },
      {
        name: "failed-stripe",
        mutate: (ev) => {
          (ev.stripe_tcp1 as { failed_visible_count: number }).failed_visible_count = 1;
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_STRIPE/,
      },
      {
        name: "pending-stripe",
        mutate: (ev) => {
          (
            ev.stripe_tcp1 as { pending_or_retry_scheduled_visible_count: number }
          ).pending_or_retry_scheduled_visible_count = 2;
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_STRIPE/,
      },
      {
        name: "inventory",
        mutate: (ev) => {
          (
            (ev.database_readonly as { ceremony_inventory: { total: number } }).ceremony_inventory
          ).total = 5;
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_INVENTORY|CONTRADICTION/,
      },
      {
        name: "history",
        mutate: (ev) => {
          (ev.database_readonly as { history_count_expected: number }).history_count_expected = 188;
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_MIGRATION/,
      },
      {
        name: "objects",
        mutate: (ev) => {
          (ev.database_readonly as { migration_objects_absent: boolean }).migration_objects_absent =
            false;
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_MIGRATION/,
      },
      {
        name: "links",
        mutate: (ev) => {
          (ev.database_readonly as { unexpected_new_links: number }).unexpected_new_links = 1;
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_DELTA/,
      },
      {
        name: "ledger",
        mutate: (ev) => {
          (
            ev.database_readonly as { webhook_ledger_non_terminal_count: number }
          ).webhook_ledger_non_terminal_count = 1;
        },
        code: /PRE_APPLY_LIVE_EVIDENCE_LEDGER/,
      },
    ];

    for (const c of cases) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ra-pro-pal-${c.name}-`));
      try {
        const ev = readFixture();
        c.mutate(ev);
        const { evidencePath, authPath } = writePair(dir, ev);
        const r = runPs(`
          $ErrorActionPreference = 'Stop'
          . ${psLiteral(GATES)}
          $auth = Get-Content -LiteralPath ${psLiteral(authPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
          try {
            Assert-RaProPreApplyLiveEvidence -Path ${psLiteral(evidencePath)} -Auth $auth
            Write-Output 'UNEXPECTED_ACCEPT'
            exit 0
          } catch {
            Write-Output ([string]\$_.Exception.Message)
            exit 1
          }
        `);
        expect(r.status, c.name).toBe(1);
        expect(r.out, c.name).toMatch(c.code);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("apply ceremony with tip UNPUBLISHED pins fails PRE_APPLY_LIVE_PINS_UNPUBLISHED before credentials", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-pal-unpub-cerm-"));
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
            // Intentionally unset STOP_AFTER_PRIOR so prior passes then pre-apply fails.
          },
        },
      );
      const combined = String(r.stdout || "") + String(r.stderr || "");
      expect(combined).toMatch(/PRE_APPLY_LIVE_PINS_UNPUBLISHED/);
      expect(combined).not.toMatch(/TEST_BOUNDARY_PRIOR_EVIDENCE_ACCEPTED/);
      const summaryPath = path.join(outDir, "PRODUCTION_APPLY_SUMMARY.json");
      expect(fs.existsSync(summaryPath)).toBe(true);
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      expect(summary.result_code).toBe("PRE_APPLY_LIVE_PINS_UNPUBLISHED");
      expect(summary.databaseConnectionAttempts ?? 0).toBe(0);
      expect(summary.sqlApplicationAttempts ?? 0).toBe(0);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("apply ceremony source forbids pre-apply path override and tip-materializes when published", () => {
    const ceremony = fs.readFileSync(path.join(ROOT, APPLY), "utf8");
    expect(ceremony).toMatch(/PRE_APPLY_LIVE_EVIDENCE_PATH_OVERRIDE_FORBIDDEN/);
    expect(ceremony).toMatch(/Import-RaProPreApplyLiveGatesFromTip/);
    expect(ceremony).toMatch(/Materialize-TipPreApplyLiveEvidence/);
    expect(ceremony).toMatch(/RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRE_APPLY_LIVE/);
    expect(ceremony).toMatch(/Test-PreApplyLivePinsPublished/);
    expect(ceremony).toMatch(
      /tests\/security\/helpers\/fixtures\/ra-pro-cutover-pre-apply-live-evidence\.json/,
    );
    const assertIdx = ceremony.indexOf("Assert-RaProPreApplyLiveEvidence");
    const publishedIdx = ceremony.indexOf("Assert-RaProPreApplyLiveEvidencePublished");
    const secureIdx = ceremony.search(/Read-Host -Prompt "RA_PRO_CUTOVER_APPLY_DATABASE_URL"/);
    expect(publishedIdx).toBeGreaterThan(-1);
    expect(assertIdx).toBeGreaterThan(-1);
    expect(secureIdx).toBeGreaterThan(-1);
    expect(publishedIdx).toBeLessThan(secureIdx);
    expect(assertIdx).toBeLessThan(secureIdx);
  });
});
