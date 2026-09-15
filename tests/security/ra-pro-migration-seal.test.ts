/**
 * Asserts the committed Git LF blob for the RA Pro billing-company migration
 * is the seal authority (not a CRLF worktree digest).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH =
  "supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql";

/** Superseded CRLF worktree measurement — must never match the Git blob. */
const SUPERSEDED_CRLF_SHA =
  "c54ff8f915d24a90de810b95882899fa8e3560fc810b18341f66d0736cfdfdcf";
const SUPERSEDED_CRLF_BYTES = 15822;

/** Post-remediation tip seal (Git LF blob). */
const EXPECTED_OID = "3ee639dcabd64484bf48c281fd987ab1eef33930";
const EXPECTED_SHA256 =
  "46cfc6780de07445541bdaefdd5b2b70bbb5fe0416b26a8efcd5cd8d6dc58486";
const EXPECTED_BYTES = 15639;

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
    expect(oid).toBe(EXPECTED_OID);
    expect(sha256).toBe(EXPECTED_SHA256);
    expect(bytes.length).toBe(EXPECTED_BYTES);
  });
});
