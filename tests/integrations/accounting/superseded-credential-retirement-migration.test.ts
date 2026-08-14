/**
 * PR F — static guards for superseded credential retirement migration.
 * Does not apply SQL to production.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION = "supabase/migrations/20260814060000_accounting_superseded_credential_retirement.sql";
const CANONICAL = "b718823a-0eb8-437d-beba-05c41f6482f9";

describe("PR F superseded credential retirement migration (static)", () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), "utf8");

  it("adds credentials_cleared_at and clears only superseded secrets", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS credentials_cleared_at timestamptz/);
    expect(sql).toMatch(/access_token\s*=\s*NULL/);
    expect(sql).toMatch(/refresh_token\s*=\s*NULL/);
    expect(sql).toMatch(/token_expires_at\s*=\s*NULL/);
    expect(sql).toMatch(
      /credentials_cleared_at\s*=\s*COALESCE\(\s*credentials_cleared_at\s*,\s*now\(\)\s*\)/,
    );
    expect(sql).not.toMatch(/timezone\(\s*'utc'\s*,\s*now\(\)\s*\)/);
    expect(sql).toMatch(/WHERE status\s*=\s*'superseded'/);
  });

  it("does not touch connected/disconnected and does not revoke providers", () => {
    expect(sql).not.toMatch(/WHERE status\s*=\s*'connected'/);
    expect(sql).not.toMatch(/WHERE status\s*=\s*'disconnected'/);
    expect(sql).not.toMatch(/status\s*=\s*'connected'/);
    expect(sql).not.toMatch(/\brevoke\b/i);
    expect(sql).not.toContain(CANONICAL);
  });

  it("preserves historical identity columns (no DELETE / no status rewrite)", () => {
    expect(sql).not.toMatch(/\bDELETE\b/i);
    expect(sql).not.toMatch(/superseded_by_connection_id\s*=/);
    expect(sql).not.toMatch(/updated_at\s*=/);
  });
});
