/**
 * Non-database contracts for E2 / F / G fixture remediations.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SUITE = join(
  ROOT,
  "lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts",
);
const SETUP = join(
  ROOT,
  "lib/journal-entry-governance/__tests__/je-reuse-disposable-setup.js",
);
const MIGRATION = join(
  ROOT,
  "supabase/migrations/20260821183525_journal_entry_executions.sql",
);
const PUBLISH = join(
  ROOT,
  "supabase/migrations/20260906184500_publish_ledger_event_extensions_digest_qualify.sql",
);

describe("E2/F/G JE reuse fixture contracts (non-database)", () => {
  const suite = readFileSync(SUITE, "utf8");
  const setup = readFileSync(SETUP, "utf8");
  const migration = readFileSync(MIGRATION, "utf8");
  const publish = readFileSync(PUBLISH, "utf8");

  it("E2 requires non-null predecessor when adjacency is asserted", () => {
    expect(suite).toMatch(
      /ready\?\.previous_event_hash\)\.toBe\(requested\?\.event_hash\)/,
    );
    expect(suite).not.toMatch(/previous_event_hash\)\.toBeNull\(/);
  });

  it("publish_ledger_event reads previous hash from ledger_chain_head singleton", () => {
    expect(publish).toMatch(
      /SELECT \* INTO v_head FROM public\.ledger_chain_head WHERE id = 1 FOR UPDATE/,
    );
    expect(publish).toMatch(/v_prev_hash\s*:=\s*v_head\.current_event_hash/);
  });

  it("F isolates state_version conflict while status remains RESERVED", () => {
    const fIdx = suite.indexOf('it("F. state_version conflict');
    const eIdx = suite.indexOf('it("E. transition RESERVED');
    expect(fIdx).toBeGreaterThan(-1);
    expect(eIdx).toBeGreaterThan(fIdx);
    const fBlock = suite.slice(fIdx, eIdx);
    expect(fBlock).toMatch(/'RESERVED',\s*99,\s*'READY_TO_POST'/);
    expect(fBlock).toMatch(/state_version concurrency conflict/i);
    expect(fBlock).toContain("je_reuse_expect_f");
    expect(fBlock).toContain("runExpectedSqlFailureInSavepoint");
  });

  it("transition RPC validates status concurrency before state_version", () => {
    const statusIdx = migration.indexOf(
      "journal_entry_execution status concurrency conflict",
    );
    const versionIdx = migration.indexOf(
      "journal_entry_execution state_version concurrency conflict",
    );
    expect(statusIdx).toBeGreaterThan(-1);
    expect(versionIdx).toBeGreaterThan(statusIdx);
  });

  it("G uses valid lowercase hex idempotency and probes transaction health", () => {
    const gIdx = suite.indexOf('it("G. transition RESERVED');
    const hIdx = suite.indexOf('it("H. concurrent approval_id');
    const gBlock = suite.slice(gIdx, hIdx);
    expect(gBlock).toMatch(/idempotency_key:\s*`\$\{"0"\.repeat\(64\)\}`/);
    expect(gBlock).not.toMatch(/"h"\.repeat\(64\)/);
    expect(gBlock).toContain("probeJeReuseTransactionHealth");
    expect("h".repeat(4)).not.toMatch(/^[a-f0-9]+$/);
    expect("0".repeat(64)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("expected-error SAVEPOINT helper and health probe are exported", () => {
    expect(setup).toContain("function runExpectedSqlFailureInSavepoint");
    expect(setup).toContain("function probeJeReuseTransactionHealth");
    expect(setup).toMatch(/ROLLBACK TO SAVEPOINT/);
    expect(setup).toMatch(/RELEASE SAVEPOINT/);
    expect(setup).toMatch(/SELECT 1::int AS ok/);
  });

  it("H–J remain after G health probe in suite source order", () => {
    const gHealth = suite.indexOf("probeJeReuseTransactionHealth(client)");
    const hIdx = suite.indexOf('it("H. concurrent approval_id');
    const iIdx = suite.indexOf('it("I. zero provider-attempt');
    const jIdx = suite.indexOf('it("J. never touches staged');
    expect(gHealth).toBeGreaterThan(-1);
    expect(hIdx).toBeGreaterThan(gHealth);
    expect(iIdx).toBeGreaterThan(hIdx);
    expect(jIdx).toBeGreaterThan(iIdx);
  });
});
