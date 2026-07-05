import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase/migrations/20260707170000_d_assertions_part_6_manual_test_evidence.sql",
);

describe("D-Assertions Part 6 migration", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("adds covering_manual_test_ids to close_assertion_coverage", () => {
    expect(sql).toContain("covering_manual_test_ids uuid[] NOT NULL DEFAULT '{}'");
  });

  it("creates manual_test_evidence with evidence_type CHECK", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.manual_test_evidence");
    expect(sql).toContain("manual_procedure");
    expect(sql).toContain("reperformance");
  });

  it("creates manual_test_attachments with bucket CHECK", () => {
    expect(sql).toContain("manual_test_attachments_bucket_check");
    expect(sql).toContain("'manual-test-evidence'");
  });

  it("creates storage bucket", () => {
    expect(sql).toContain("INSERT INTO storage.buckets");
    expect(sql).toContain("false");
  });
});
