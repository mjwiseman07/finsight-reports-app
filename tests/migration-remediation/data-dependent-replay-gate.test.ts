import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const CLASSIFICATION = path.join(ROOT, "docs/migration-remediation/migration-lineage-classification.json");
const GATE_JSON = path.join(ROOT, "docs/migration-remediation/data-dependent-replay-gate.json");
const CLASSIFY_SCRIPT = path.join(ROOT, "scripts/migration-remediation/audit-migration-lineage-classification.js");
const GATE_SCRIPT = path.join(ROOT, "scripts/migration-remediation/audit-data-dependent-replay-gate.js");
const GUARDED_PROPOSAL = path.join(
  ROOT,
  "supabase/migrations-draft/clean-replay-proposals/d6_2a_test_client_activation.guarded.sql",
);

describe("data-dependent clean replay gate", () => {
  it("generates migration lineage classification manifest", () => {
    execFileSync(process.execPath, [CLASSIFY_SCRIPT], { cwd: ROOT, stdio: "pipe" });
    expect(fs.existsSync(CLASSIFICATION)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(CLASSIFICATION, "utf8"));
    expect(manifest.g2SecondReplay.failingProductionName).toBe("d6_2a_test_client_activation");
    expect(manifest.g2SecondReplay.baselineOrderingPass).toBe(true);
    expect(manifest.g2SecondReplay.phase1RlsPass).toBe(true);
    expect(manifest.g2SecondReplay.jeStackReached).toBe(false);
    expect(manifest.g2SecondReplay.branchDeleted).toBe(true);
    expect(manifest.summary.localMigrationCount).toBeGreaterThan(100);
    expect(manifest.summary.productionMigrationCount).toBe(185);
  });

  it("classifies d6_2 activations as clean-replay blockers", () => {
    const manifest = JSON.parse(fs.readFileSync(CLASSIFICATION, "utf8"));
    const d6Names = ["d6_2a_test_client_activation", "d6_2b_mfg_activation", "d6_2c_retail_activation", "d6_2d_ps_activation"];
    for (const name of d6Names) {
      const row = manifest.production.find((p: { productionName: string }) => p.productionName === name);
      expect(row).toBeDefined();
      expect(row?.cleanReplayPolicy).toBe("blocks_clean_replay_unless_guarded");
    }
    const first = manifest.blockers.find(
      (b: { productionVersion: string }) => b.productionVersion === "20260703182655",
    );
    expect(first?.localFilename).toBe("20260703_2000_d6_2a_test_client_activation.sql");
  });

  it("documents d1_1 backfill as guarded no-op on empty branch", () => {
    const manifest = JSON.parse(fs.readFileSync(CLASSIFICATION, "utf8"));
    const row = manifest.local.find(
      (l: { filename: string }) => l.filename === "20260708_02_d1_1_owner_user_id_backfill.sql",
    );
    expect(row?.cleanReplayPolicy).toBe("skip_on_empty_guarded");
  });

  it("static replay gate fails merge readiness while executable blockers remain in git", () => {
    try {
      execFileSync(process.execPath, [GATE_SCRIPT], { cwd: ROOT, stdio: "pipe" });
    } catch {
      // Gate exits non-zero when mergeReady is false — expected until guarded SQL is promoted.
    }
    const gate = JSON.parse(fs.readFileSync(GATE_JSON, "utf8"));
    expect(gate.mergeReady).toBe(false);
    expect(gate.ok).toBe(false);
    expect(gate.blockingViolations.length).toBeGreaterThanOrEqual(4);
    expect(gate.documentedBlockerCount).toBeGreaterThanOrEqual(4);
    expect(gate.undocumentedViolations).toHaveLength(0);
    expect(gate.remediationReference).toContain("clean-replay-architecture.md");
  });

  it("guarded d6_2a proposal uses firm_clients existence join", () => {
    const sql = fs.readFileSync(GUARDED_PROPOSAL, "utf8");
    expect(sql).toContain("FROM public.firm_clients fc");
    expect(sql).toContain("71111111-1111-4111-8111-111111111111");
    expect(sql).toMatch(/insert\s+into[\s\S]*select[\s\S]*from\s+public\.firm_clients/i);
    expect(sql).not.toMatch(/insert\s+into[\s\S]*\)\s*values\s*\(/i);
  });

  it("regression: unguarded d6_2a local migration still flagged", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "supabase/migrations/20260703_2000_d6_2a_test_client_activation.sql"),
      "utf8",
    );
    expect(/insert\s+into[\s\S]*values[\s\S]*71111111-1111/i.test(sql)).toBe(true);
    expect(/from\s+public\.firm_clients/i.test(sql)).toBe(false);
  });
});
