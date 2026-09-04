import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectPlaceholderSeed,
  evaluateRuleSeedOrdering,
  extractCoverageConsumerRuleIds,
  extractRegistrySeedRuleIds,
  KNOWN_REFERENCE_SEED_FILES,
  OPERATIONAL_ACTIVATION_FILES,
} from "../../scripts/migration-remediation/audit-option-d-rule-seed-deps.js";
import {
  evaluateManifestAuthorization,
  evaluateManifestUnchangedSinceAuthorization,
  resolveGitHead,
  sha256Buffer,
} from "../../scripts/migration-remediation/option-d-manifest-authorization.js";

const ROOT = path.resolve(__dirname, "../..");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const INVENTORY = path.join(
  ROOT,
  "docs/migration-remediation/option-d-rule-seed-dependency-inventory.json",
);
const MIGRATIONS = path.join(ROOT, "supabase/migrations");

const D0 = "20260708_00_d0_identity_and_memory_activation.sql";
const D6_0 = "20260703_1200_d6_0_vertical_rule_foundation.sql";
const PART1 = "20260707120000_d_assertions_part_1_schema_and_backfill.sql";
const ACCRUAL = "gen.accrual_reversal_check";

function readSql(filename: string) {
  return fs.readFileSync(path.join(MIGRATIONS, filename), "utf8");
}

describe("Option D curated rule-seed provenance", () => {
  it("authoritative creator of gen.accrual_reversal_check is d6_0 vertical foundation in git", () => {
    const d0Ids = extractRegistrySeedRuleIds(readSql(D0));
    const d6Ids = extractRegistrySeedRuleIds(readSql(D6_0));
    expect(d0Ids.has(ACCRUAL)).toBe(false);
    expect(d6Ids.has(ACCRUAL)).toBe(true);
    expect(KNOWN_REFERENCE_SEED_FILES).toContain(D6_0);
    expect(KNOWN_REFERENCE_SEED_FILES).toContain(D0);
  });

  it("Part 1 coverage backfill consumes accrual_reversal and other seeded rule ids", () => {
    const consumed = extractCoverageConsumerRuleIds(readSql(PART1));
    expect(consumed.has(ACCRUAL)).toBe(true);
    expect(consumed.size).toBeGreaterThan(10);
  });

  it("operational activation files are not admitted as reference seed creators", () => {
    for (const f of OPERATIONAL_ACTIVATION_FILES) {
      const abs = path.join(MIGRATIONS, f);
      if (!fs.existsSync(abs)) continue;
      const ids = extractRegistrySeedRuleIds(fs.readFileSync(abs, "utf8"));
      expect(ids.size, f).toBe(0);
    }
  });
});

describe("Option D rule-seed ordering gates (negative)", () => {
  it("missing required rule seed blocks readiness", () => {
    const result = evaluateRuleSeedOrdering([
      {
        filename: PART1,
        order: 1,
        sql: `INSERT INTO rule_assertion_coverage (rule_id, assertion_id) VALUES ('${ACCRUAL}', 'a1');\n`,
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "missing_required_rule_seed_creator")).toBe(
      true,
    );
  });

  it("misordered seed blocks readiness", () => {
    const result = evaluateRuleSeedOrdering([
      {
        filename: PART1,
        order: 1,
        sql: `INSERT INTO rule_assertion_coverage (rule_id, x) VALUES ('${ACCRUAL}', 1);\n`,
      },
      {
        filename: D6_0,
        order: 2,
        sql: `INSERT INTO curated_rules_registry (rule_id) VALUES ('${ACCRUAL}') ON CONFLICT DO NOTHING;\n`,
      },
      {
        filename: D0,
        order: 0,
        sql: `INSERT INTO curated_rules_registry (rule_id) VALUES ('gen.je_balance_check') ON CONFLICT DO NOTHING;\n`,
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "rule_seed_misordered")).toBe(true);
  });

  it("placeholder / incomplete seed patterns are rejected", () => {
    const sql = `
-- placeholder rule for gen.accrual_reversal_check
INSERT INTO curated_rules_registry VALUES ('gen.accrual_reversal_check', 'TODO');
SELECT set_config('session_replication_role', 'replica', true);
`;
    const hits = detectPlaceholderSeed(sql);
    expect(hits).toEqual(
      expect.arrayContaining([
        "placeholder_rule_comment",
        "todo_placeholder_values",
        "session_replication_role",
      ]),
    );

    const incomplete = evaluateRuleSeedOrdering([
      {
        filename: D6_0,
        order: 1,
        sql: `INSERT INTO curated_rules_registry VALUES ('gen.other_rule');\n`,
      },
      {
        filename: PART1,
        order: 2,
        sql: `INSERT INTO rule_assertion_coverage (rule_id, x) VALUES ('${ACCRUAL}', 1);\n`,
      },
    ]);
    expect(incomplete.ok).toBe(false);
    expect(incomplete.failures.some((f) => f.rule === "missing_required_rule_seed_creator")).toBe(
      true,
    );
  });

  it("tenant/operational activation inserts are rejected as coverage FK creators", () => {
    const op = OPERATIONAL_ACTIVATION_FILES[0];
    const result = evaluateRuleSeedOrdering([
      {
        filename: op,
        order: 1,
        sql: `INSERT INTO curated_rules_registry (rule_id) VALUES ('${ACCRUAL}') ON CONFLICT DO NOTHING;\n`,
      },
      {
        filename: PART1,
        order: 2,
        sql: `INSERT INTO rule_assertion_coverage (rule_id, x) VALUES ('${ACCRUAL}', 1);\n`,
      },
    ]);
    expect(result.ok).toBe(false);
    expect(
      result.failures.some(
        (f) =>
          f.rule === "non_reference_seed_for_coverage_fk" ||
          f.rule === "operational_file_inserts_registry_rows",
      ),
    ).toBe(true);
  });

  it("FK enforcement stays active — no disable / replica-role bypass admitted", () => {
    const assembled = path.join(
      ROOT,
      "supabase/migrations-draft/option-d-isolated-replay/assembled",
      PART1,
    );
    const sql = fs.existsSync(assembled)
      ? fs.readFileSync(assembled, "utf8")
      : readSql(PART1);
    expect(/session_replication_role/i.test(sql)).toBe(false);
    expect(/disable\s+trigger/i.test(sql)).toBe(false);
    expect(/alter\s+table[\s\S]{0,80}disable/i.test(sql)).toBe(false);
    expect(/references\s+(?:public\.)?curated_rules_registry/i.test(sql)).toBe(true);
    expect(/drop\s+constraint[\s\S]{0,80}rule_assertion_coverage/i.test(sql)).toBe(false);
  });

  it("no broad skip/guard can hide a missing required rule in the evaluator", () => {
    const guardedConsumer = `
DO $$ BEGIN
  IF to_regclass('public.curated_rules_registry') IS NOT NULL THEN
    INSERT INTO rule_assertion_coverage (rule_id, x) VALUES ('${ACCRUAL}', 1);
  END IF;
END $$;
INSERT INTO rule_assertion_coverage (rule_id, x) VALUES ('${ACCRUAL}', 1);
`;
    const result = evaluateRuleSeedOrdering([
      { filename: PART1, order: 1, sql: guardedConsumer },
    ]);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.ruleId === ACCRUAL)).toBe(true);
  });
});

describe("Option D rule-seed assemble + inventory + auth", () => {
  it("assemble places D0 and d6_0 before Part 1 and writes inventory PASS", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, encoding: "utf8" });
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const d0 = manifest.entries.find(
      (e: { assembledFilename: string }) => e.assembledFilename === D0,
    )?.order;
    const d6 = manifest.entries.find(
      (e: { assembledFilename: string }) => e.assembledFilename === D6_0,
    )?.order;
    const part1 = manifest.entries.find(
      (e: { assembledFilename: string }) => e.assembledFilename === PART1,
    )?.order;
    expect(d0).toBeDefined();
    expect(d6).toBeDefined();
    expect(part1).toBeDefined();
    expect(d0!).toBeLessThan(d6!);
    expect(d6!).toBeLessThan(part1!);
    expect(manifest.ordering.ruleSeedRegression.dependencyOrderSatisfied).toBe(true);

    expect(fs.existsSync(INVENTORY)).toBe(true);
    const inv = JSON.parse(fs.readFileSync(INVENTORY, "utf8"));
    expect(inv.ok).toBe(true);
    expect(inv.failures).toHaveLength(0);
    expect(inv.requiredRuleIds).toContain(ACCRUAL);
    expect(inv.creators[ACCRUAL].creator).toBe(D6_0);
    expect(inv.creators[ACCRUAL].classification).toBe("immutable_reference_seed");
    expect(inv.testedFailure.classification).toBe("later_creator_currently_misordered");
  });

  it("manifest regeneration / changed bytes requires new runtime authorization", () => {
    const head = resolveGitHead(ROOT)!;
    const hash = sha256Buffer(fs.readFileSync(MANIFEST));
    const auth = evaluateManifestAuthorization({
      expectedSha256: "0".repeat(64),
      authorizedCommit: head,
      currentHead: head,
      requireCommitBinding: true,
    });
    expect(auth.ok).toBe(false);
    expect(auth.failures.some((f: { rule: string }) => f.rule === "manifest_sha256_mismatch")).toBe(
      true,
    );

    const regenerated = evaluateManifestUnchangedSinceAuthorization({
      authorizedObservedSha256: hash,
      manifestBytes: Buffer.from('{"generatedAt":"changed-after-auth"}'),
    });
    expect(regenerated.ok).toBe(false);
    expect(
      regenerated.failures.some((f: { rule: string }) => f.rule === "manifest_regenerated_after_authorization"),
    ).toBe(true);
  });
});
