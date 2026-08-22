/**
 * JE-3B1 — Recovery Patent #6 receipts + narrowed generic patch.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { patchJournalEntryProviderAttempt } from "../provider-attempt-repository";
import { JE_PROVIDER_ATTEMPT_ERROR } from "../provider-attempt-types";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821220646_journal_entry_provider_discovery_receipts.sql",
);

describe("JE-3B1 discovery receipt migration", () => {
  const src = readFileSync(MIGRATION, "utf8");

  it("adds provider_commit_discovered RPC + event", () => {
    expect(src).toContain(
      "apply_journal_entry_provider_commit_discovered",
    );
    expect(src).toContain("journal_entry.provider_commit_discovered");
    expect(src).toContain("DISCOVERED_COMMITTED");
    expect(src).toContain("commit_certainty = 'COMMITTED'");
  });

  it("adds provider_not_found_confirmed RPC + event", () => {
    expect(src).toContain(
      "apply_journal_entry_provider_not_found_confirmed",
    );
    expect(src).toContain("journal_entry.provider_not_found_confirmed");
    expect(src).toContain("DISCOVERED_NOT_FOUND");
    expect(src).toContain("NOT_SENT");
    expect(src).toContain("DEFINITELY_NOT_COMMITTED");
  });

  it("narrows generic patch: blocks COMMITTED / DISCOVERED_* / qbo_je_id", () => {
    expect(src).toContain("je_provider_attempt_patch_forbidden");
    expect(src).toContain("qbo_je_id requires provider_commit_discovered RPC");
    expect(src).toContain("COMMITTED requires provider_commit_discovered RPC");
    expect(src).toContain("DISCOVERED_COMMITTED");
    expect(src).toContain("DISCOVERED_NOT_FOUND");
  });

  it("couples payload execution_id / attempt_id / qbo_je_id", () => {
    expect(src).toContain("payload qbo_je_id mismatch");
    expect(src).toContain("payload execution_id mismatch");
    expect(src).toContain("payload provider_attempt_id mismatch");
  });

  it("does not enable VERIFIED or governed POST", () => {
    expect(src).toMatch(/Does NOT enable VERIFIED/i);
    expect(src).toMatch(/Does NOT enable governed QBO POST/i);
    expect(src).not.toContain("journalentry?minorversion");
  });
});

describe("generic patch client-side conclusion guard", () => {
  it("10-12. refuses COMMITTED / DISCOVERED_COMMITTED / qbo_je_id without calling RPC", async () => {
    await expect(
      patchJournalEntryProviderAttempt({
        attemptId: "att-1",
        expectedStatus: "UNKNOWN_RESULT",
        patch: { commit_certainty: "COMMITTED" },
      }),
    ).rejects.toMatchObject({
      code: JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      message: expect.stringMatching(/COMMITTED/),
    });

    await expect(
      patchJournalEntryProviderAttempt({
        attemptId: "att-1",
        expectedStatus: "UNKNOWN_RESULT",
        patch: { status: "DISCOVERED_COMMITTED" },
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/DISCOVERED_COMMITTED/),
    });

    await expect(
      patchJournalEntryProviderAttempt({
        attemptId: "att-1",
        expectedStatus: "UNKNOWN_RESULT",
        patch: { qbo_je_id: "123" },
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/qbo_je_id/),
    });
  });
});
