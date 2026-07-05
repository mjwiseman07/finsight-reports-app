import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase/migrations/20260707160000_d_assertions_part_5_gap_review_items.sql",
);

const EXPECTED_COLUMNS = [
  "id",
  "firm_client_id",
  "engagement_id",
  "close_period_id",
  "account_category",
  "assertion_id",
  "gap_root_cause_code",
  "gap_recommendation",
  "relevance_at_detection",
  "severity",
  "resolution_status",
  "resolution_type",
  "resolution_metadata",
  "resolved_by_user_id",
  "resolved_at",
  "resolution_status_prior",
  "reopened_at",
  "first_detected_at",
  "last_projected_at",
  "created_at",
  "updated_at",
];

function readPart5Sql(): string {
  return readFileSync(MIGRATION_PATH, "utf8");
}

describe("D-Assertions Part 5 migration", () => {
  const sql = readPart5Sql();

  it("close_gap_review_items table exists with expected columns", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS close_gap_review_items");
    for (const col of EXPECTED_COLUMNS) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it("unique constraint on (firm_client_id, close_period_id, account_category, assertion_id)", () => {
    expect(sql).toContain("close_gap_review_items_natural_key");
    expect(sql).toContain("UNIQUE (firm_client_id, close_period_id, account_category, assertion_id)");
  });

  it("resolution_coherent CHECK rejects open+resolution_type in SQL definition", () => {
    expect(sql).toContain("close_gap_review_items_resolution_coherent");
    expect(sql).toMatch(
      /resolution_status = 'open' AND resolution_type IS NULL AND resolved_at IS NULL/,
    );
  });

  it("resolution_coherent CHECK rejects resolved+missing_resolution_type in SQL definition", () => {
    expect(sql).toMatch(
      /resolution_status <> 'open' AND resolution_type IS NOT NULL AND resolved_at IS NOT NULL/,
    );
  });

  it("FK to assertions_catalog via assertion_id column", () => {
    expect(sql).toMatch(
      /assertion_id\s+text NOT NULL REFERENCES assertions_catalog\(assertion_id\)/,
    );
  });
});
