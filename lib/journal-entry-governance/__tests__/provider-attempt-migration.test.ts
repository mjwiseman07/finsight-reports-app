/**
 * JE-3B1 migration static contract tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821212020_journal_entry_provider_attempts.sql",
);

describe("JE-3B1 provider-attempt migration", () => {
  const src = readFileSync(MIGRATION, "utf8");

  it("creates journal_entry_provider_attempts with execution_id UNIQUE", () => {
    expect(src).toContain("CREATE TABLE IF NOT EXISTS public.journal_entry_provider_attempts");
    expect(src).toContain("UNIQUE (execution_id)");
    expect(src).toContain("REFERENCES public.journal_entry_executions(id)");
  });

  it("does not use je_post_attempts as governed authority", () => {
    expect(src).toMatch(/Does not replace je_post_attempts/i);
    expect(src).not.toMatch(/ALTER TABLE.*je_post_attempts/i);
  });

  it("widens transition RPC with JE-3B1 pairs and forbids UNKNOWN→POSTING / VERIFIED", () => {
    expect(src).toContain("journal_entry.posting_started");
    expect(src).toContain("journal_entry.provider_posted");
    expect(src).toContain("journal_entry.post_unknown");
    expect(src).toContain("journal_entry.execution_failed");
    expect(src).toContain("UNKNOWN_COMMIT → POSTING intentionally absent");
    expect(src).toContain("POSTED_UNVERIFIED → VERIFIED intentionally absent");
    expect(src).toContain(
      "COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM p_new_status",
    );
  });

  it("attempt statuses + commit certainty vocabulary", () => {
    for (const s of [
      "RESERVED",
      "REQUEST_STARTED",
      "RESPONSE_RECEIVED",
      "UNKNOWN_RESULT",
      "FAILED_PRECOMMIT",
      "DISCOVERED_COMMITTED",
      "DISCOVERED_NOT_FOUND",
      "VERIFIED_PROVIDER_ID",
    ]) {
      expect(src).toContain(`'${s}'`);
    }
    for (const c of [
      "NOT_SENT",
      "DEFINITELY_NOT_COMMITTED",
      "POSSIBLY_COMMITTED",
      "COMMITTED",
    ]) {
      expect(src).toContain(`'${c}'`);
    }
  });
});
