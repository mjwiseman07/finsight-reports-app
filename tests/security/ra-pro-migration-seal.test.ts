/**
 * Asserts the committed Git LF blob for the RA Pro billing-company migration
 * is the seal authority (not a CRLF worktree digest).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH =
  "supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql";

const SUPERSEDED_CRLF_SHA =
  "c54ff8f915d24a90de810b95882899fa8e3560fc810b18341f66d0736cfdfdcf";
const SUPERSEDED_CRLF_BYTES = 15822;

/** Atomic checkout bootstrap tip seal (Git LF blob). */
const EXPECTED_OID = "646a6ed5e8582f4ebb9e7064457888f7752a3062";
const EXPECTED_SHA256 =
  "72a167a5370df518c92c9ff0107f2ce8b89afe75f3de14e166a84a6b7dafd589";
const EXPECTED_BYTES = 35883;

function blobAtHead(): { oid: string; bytes: Buffer; sha256: string } {
  const oid = execFileSync("git", ["rev-parse", `HEAD:${MIGRATION_PATH}`], {
    encoding: "utf8",
  }).trim();
  const bytes = execFileSync("git", ["cat-file", "blob", oid]);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { oid, bytes, sha256 };
}

describe("RA Pro migration Git LF seal authority", () => {
  it("committed blob is LF-only and not the superseded CRLF digest", () => {
    const { bytes, sha256 } = blobAtHead();
    expect(bytes.includes(0x0d)).toBe(false);
    expect(sha256).not.toBe(SUPERSEDED_CRLF_SHA);
    expect(bytes.length).not.toBe(SUPERSEDED_CRLF_BYTES);
  });

  it("HEAD blob matches the published tip seal", () => {
    const { oid, bytes, sha256 } = blobAtHead();
    expect(sha256).toBe(EXPECTED_SHA256);
    expect(bytes.length).toBe(EXPECTED_BYTES);
    expect(oid).toBe(EXPECTED_OID);
  });

  it("migration text forbids legacy backfill", () => {
    const { bytes } = blobAtHead();
    const text = bytes.toString("utf8");
    expect(text).toMatch(/NO company↔firm backfill|NO company.+firm backfill|no_backfill/i);
    expect(text).toMatch(/ra_pro_no_backfill_expected_zero_linked_firms/);
    expect(text).toMatch(/ra_pro_no_backfill_postcondition_failed/);
    expect(text).not.toMatch(/UPDATE\s+public\.firms\s+SET\s+billing_company_id\s*=\s*'[0-9a-f-]{36}'/i);
  });
});
