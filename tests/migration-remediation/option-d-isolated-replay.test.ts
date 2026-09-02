import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  validateIsolatedReplayTarget,
  PRODUCTION_PROJECT_REF,
} from "../../scripts/migration-remediation/option-d-target-safety.js";

const ROOT = path.resolve(__dirname, "../..");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");
const GATE = path.join(ROOT, "scripts/migration-remediation/audit-option-d-replay-gate.js");
const ACTIVE_GATE = path.join(ROOT, "scripts/migration-remediation/audit-data-dependent-replay-gate.js");
const RUNTIME = path.join(ROOT, "scripts/migration-remediation/run-option-d-isolated-replay.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const OPTION_D_GATE_JSON = path.join(ROOT, "docs/migration-remediation/option-d-replay-gate.json");
const RUNTIME_STATUS = path.join(ROOT, "docs/migration-remediation/option-d-runtime-status.json");
const SUBST_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/substitutions",
);

const BLOCKERS = [
  "20260703_2000_d6_2a_test_client_activation.sql",
  "20260703_2200_d6_2b_mfg_activation.sql",
  "20260703_2300_d6_2c_retail_activation.sql",
  "20260703_2400_d6_2d_ps_activation.sql",
  "20260708120000_tcp1_w1_solo_bk_pilot_slots.sql",
  "20260814221500_accounting_canonical_connected_grant.sql",
];

describe("Option D isolated Git replay harness", () => {
  it("assembles deterministic candidate lineage with in-place substitutions", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, stdio: "pipe" });
    expect(fs.existsSync(MANIFEST)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    expect(manifest.mechanism).toBe("option_d_isolated_git_replay");
    expect(manifest.notMergeApproval).toBe(true);
    expect(manifest.productionHistoryUnchanged).toBe(true);
    expect(manifest.activeMigrationsUnchanged).toBe(true);
    expect(manifest.productionDashboardReplayParity).toBe("unresolved");
    expect(manifest.pr312HeadRequiredUnchanged).toBe(
      "f65730b3d38e9cb3b192e54f62c798c74a07a1c2",
    );
    expect(manifest.counts.substitutions).toBe(6);
    expect(manifest.missingRequiredPatent6OrJe).toEqual([]);
    expect(manifest.substitutions.map((s: { filename: string }) => s.filename).sort()).toEqual(
      [...BLOCKERS].sort(),
    );
    for (const s of manifest.substitutions) {
      expect(s.originalSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(s.replacementSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(s.originalSha256).not.toBe(s.replacementSha256);
      expect(s.order).toBeGreaterThan(5);
      expect(s.justification.length).toBeGreaterThan(20);
    }
    // Substitutions are in-place (same filename), not appended after originals
    const d6a = manifest.entries.filter(
      (e: { assembledFilename: string }) =>
        e.assembledFilename === "20260703_2000_d6_2a_test_client_activation.sql",
    );
    expect(d6a).toHaveLength(1);
    expect(d6a[0].action).toBe("substitute");
  });

  it("covers all six blockers with substitution files on disk", () => {
    for (const file of BLOCKERS) {
      expect(fs.existsSync(path.join(SUBST_DIR, file))).toBe(true);
    }
  });

  it("Option D candidate gate passes (zero executable blockers in assembled set)", () => {
    execFileSync(process.execPath, [GATE], { cwd: ROOT, stdio: "pipe" });
    const gate = JSON.parse(fs.readFileSync(OPTION_D_GATE_JSON, "utf8"));
    expect(gate.mergeReady).toBe(true);
    expect(gate.ok).toBe(true);
    expect(gate.violationCount).toBe(0);
    expect(gate.scopes.productionDashboardReplayParity).toBe("unresolved");
  });

  it("active supabase/migrations gate still fails (promotion not done)", () => {
    try {
      execFileSync(process.execPath, [ACTIVE_GATE], { cwd: ROOT, stdio: "pipe" });
    } catch {
      // expected non-zero
    }
    const gate = JSON.parse(
      fs.readFileSync(path.join(ROOT, "docs/migration-remediation/data-dependent-replay-gate.json"), "utf8"),
    );
    expect(gate.mergeReady).toBe(false);
    expect(gate.violationCount).toBeGreaterThanOrEqual(4);
  });

  it("target safety rejects production and remote supabase hosts", () => {
    expect(
      validateIsolatedReplayTarget(
        `postgresql://postgres:secret@db.${PRODUCTION_PROJECT_REF}.supabase.co:5432/postgres`,
      ).ok,
    ).toBe(false);
    expect(
      validateIsolatedReplayTarget(
        "postgresql://postgres:secret@db.abcdefghijklmnop.supabase.co:5432/postgres",
      ).ok,
    ).toBe(false);
    expect(
      validateIsolatedReplayTarget("postgresql://postgres:postgres@127.0.0.1:54322/postgres").ok,
    ).toBe(true);
    expect(validateIsolatedReplayTarget("postgresql://postgres:postgres@localhost:54322/postgres").ok).toBe(
      true,
    );
  });

  it("runtime harness reports BLOCKED without approved local apply (not PASS)", () => {
    const env = { ...process.env };
    delete env.OPTION_D_APPLY;
    delete env.OPTION_D_DATABASE_URL;
    delete env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL;
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [RUNTIME], {
        cwd: ROOT,
        env,
        stdio: "pipe",
      });
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
    }
    expect(exitCode).not.toBe(0);
    expect(fs.existsSync(RUNTIME_STATUS)).toBe(true);
    const status = JSON.parse(fs.readFileSync(RUNTIME_STATUS, "utf8"));
    expect(status.overall).toBe("BLOCKED");
    expect(status.scopes.isolatedCandidateLineage).toBe("PASS_STATIC");
    expect(status.scopes.pr312RpcValidation).toBe("BLOCKED");
    expect(status.scopes.productionDashboardReplayParity).toBe("unresolved");
    expect(JSON.stringify(status)).not.toMatch(/password=/i);
  });
});
