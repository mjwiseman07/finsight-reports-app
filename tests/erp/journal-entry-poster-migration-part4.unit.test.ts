import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ASSERTION_IDS } from "@/lib/pre-close/assertions-types";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase/migrations/20260707150000_d_assertions_part_4_je_propagation.sql",
);

function readSql() {
  return readFileSync(MIGRATION_PATH, "utf8");
}

/** Mirror of validate_assertions_array for unit-level behavioral checks. */
function validateAssertionsArray(
  assertionIds: string[] | null | undefined,
  known: Set<string>,
): boolean {
  if (!assertionIds || assertionIds.length === 0) return true;
  if (new Set(assertionIds).size !== assertionIds.length) return false;
  return assertionIds.every((id) => known.has(id));
}

function reliabilityRequiredWhenTagged(
  assertions: string[] | null | undefined,
  basis: string | null | undefined,
): boolean {
  if (!assertions || assertions.length === 0) return true;
  return basis != null;
}

describe("D-Assertions Part 4 migration", () => {
  it("validate_assertions_array function exists in migration SQL", () => {
    const sql = readSql();
    expect(sql).toContain("CREATE OR REPLACE FUNCTION validate_assertions_array");
    expect(sql).toContain("assertions_catalog");
  });

  it("validate_assertions_array rejects unknown assertion IDs", () => {
    const known = new Set(ASSERTION_IDS);
    expect(validateAssertionsArray(["bogus_assertion"], known)).toBe(false);
    expect(validateAssertionsArray(["completeness"], known)).toBe(true);
  });

  it("validate_assertions_array rejects duplicates", () => {
    const known = new Set(ASSERTION_IDS);
    expect(validateAssertionsArray(["completeness", "completeness"], known)).toBe(false);
  });

  it("je_posting_audit.assertions_addressed CHECK constraint is declared", () => {
    const sql = readSql();
    expect(sql).toContain("je_posting_audit_valid_assertions");
    expect(sql).toContain("CHECK (validate_assertions_array(assertions_addressed))");
  });

  it("je_posting_audit_reliability_required_when_tagged CHECK fires when tagged without basis", () => {
    const sql = readSql();
    expect(sql).toContain("je_posting_audit_reliability_required_when_tagged");
    expect(reliabilityRequiredWhenTagged(["completeness"], null)).toBe(false);
    expect(reliabilityRequiredWhenTagged(["completeness"], "qbo_api_authenticated")).toBe(true);
    expect(reliabilityRequiredWhenTagged([], null)).toBe(true);
  });

  it("je_posting_audit_assertions_gin index is declared", () => {
    expect(readSql()).toContain("je_posting_audit_assertions_gin");
  });

  it("pre_close_review_items_assertion_tags_gin index is declared", () => {
    expect(readSql()).toContain("pre_close_review_items_assertion_tags_gin");
  });
});
