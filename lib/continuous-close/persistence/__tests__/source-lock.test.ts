import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const PERSISTENCE_FILES = [
  "lib/continuous-close/persistence/run-and-persist-observe.ts",
  "lib/continuous-close/persistence/repository.ts",
  "lib/continuous-close/persistence/loaders.ts",
  "lib/continuous-close/persistence/authoritative-urm-mapper.ts",
  "lib/continuous-close/persistence/hash.ts",
  "lib/continuous-close/persistence/types.ts",
  "lib/continuous-close/persistence/index.ts",
];

describe("CC-2B source locks", () => {
  const src = PERSISTENCE_FILES.map((file) => read(file)).join("\n");

  it("does not import or wire the tie-out worker, cron, or regenerate", () => {
    expect(src).not.toMatch(/tie-out\/worker/);
    expect(src).not.toMatch(/regenerate-run/);
    expect(src).not.toMatch(/audit_ready_cron_runs/);
  });

  it("does not import provider write or JE posting APIs", () => {
    expect(src).not.toMatch(/bookJournalEntry|postJournal|writeInvoice|qboWrite/);
    expect(src).not.toMatch(/lib\/erp\/quickbooks\/write/);
    expect(src).not.toMatch(/mayWriteProviderErp:\s*true/);
  });

  it("does not write Memory or assertion coverage rows", () => {
    expect(src).not.toContain("close_assertion_coverage");
    expect(src).not.toContain("close_gap_review_items");
    expect(src).not.toMatch(/pilot_lifecycle_events/);
    expect(src).not.toMatch(/from\("memory/);
  });

  it("does not rebuild statement control or fetch provider reports", () => {
    expect(src).not.toContain("buildStatementControl");
    expect(src).not.toContain("fetchQbo");
    expect(src).not.toContain("active_normalized_sync_id");
    expect(src).not.toContain("last_sync_id");
    expect(src).not.toContain("latest_success");
  });

  it("does not use created_at as freshness authority", () => {
    const loaders = read("lib/continuous-close/persistence/loaders.ts");
    expect(loaders).toContain("last_synced_at");
    expect(loaders).not.toMatch(/syncedAt:.*created_at/);
  });

  it("loads the exact accounting_syncs id", () => {
    const loaders = read("lib/continuous-close/persistence/loaders.ts");
    expect(loaders).toContain('.from("accounting_syncs")');
    expect(loaders).toContain('.eq("id", syncId)');
  });

  it("does not silently default to DEFAULT_OBSERVE_POLICY", () => {
    const service = read("lib/continuous-close/persistence/run-and-persist-observe.ts");
    expect(service).not.toMatch(/import[\s\S]*DEFAULT_OBSERVE_POLICY/);
    expect(service).not.toMatch(/=\s*DEFAULT_OBSERVE_POLICY/);
    expect(service).toContain("ContinuousCloseObservePolicy is required");
  });

  it("does not duplicate Merkle chain columns on the CC run row", () => {
    const types = read("lib/continuous-close/persistence/types.ts");
    const migration = read("supabase/migrations/20260819045253_continuous_close_runs.sql");
    expect(types).not.toMatch(/event_hash|merkle_root|prev_hash|curr_hash/);
    expect(migration).not.toMatch(/event_hash|merkle_root|previous_event_hash/);
  });
});
