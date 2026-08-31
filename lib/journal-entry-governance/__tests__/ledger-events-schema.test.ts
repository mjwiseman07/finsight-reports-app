import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEDGER_EVENTS_FORBIDDEN_SELECT_COLUMNS,
  LEDGER_EVENTS_GOVERNED_JE_COLUMNS,
  LEDGER_EVENTS_PATENT6_CHAIN_SELECT,
  LEDGER_EVENTS_RECEIPT_ID_SELECT,
  assertPatent6ChainReceiptCustody,
} from "../ledger-events-schema";

const root = process.cwd();
const foundationMigration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/20260706120000_d_platform_event_sourced_foundation.sql",
  ),
  "utf8",
);

describe("ledger_events schema contract", () => {
  it("documents authoritative timestamp columns from foundation migration", () => {
    const ledgerEventsBlock =
      foundationMigration.match(
        /CREATE TABLE IF NOT EXISTS public\.ledger_events[\s\S]*?\);/,
      )?.[0] ?? "";
    expect(ledgerEventsBlock).toContain("occurred_at");
    expect(ledgerEventsBlock).toContain("recorded_at");
    expect(ledgerEventsBlock).not.toContain("created_at");
  });

  it("Patent #6 chain select uses only governed JE columns and excludes forbidden columns", () => {
    const selected = LEDGER_EVENTS_PATENT6_CHAIN_SELECT.split(",")
      .map((column) => column.trim())
      .filter(Boolean);

    for (const column of selected) {
      expect(LEDGER_EVENTS_GOVERNED_JE_COLUMNS).toContain(column);
      expect(LEDGER_EVENTS_FORBIDDEN_SELECT_COLUMNS).not.toContain(column);
    }
    expect(selected).not.toContain("created_at");
  });

  it("receipt-id select uses chain_index and event_sequence ordering fields", () => {
    expect(LEDGER_EVENTS_RECEIPT_ID_SELECT).toContain("chain_index");
    expect(LEDGER_EVENTS_RECEIPT_ID_SELECT).toContain("event_sequence");
    expect(LEDGER_EVENTS_RECEIPT_ID_SELECT).not.toContain("created_at");
  });

  it("validates Patent #6 adjacency and verification receipt binding", () => {
    const executionId = "08bbbd62-8c4e-4463-b96e-2bd8bfdce603";
    expect(() =>
      assertPatent6ChainReceiptCustody({
        executionId,
        verificationReceiptId: "evt-verify",
        events: [
          {
            event_id: "evt-1",
            event_type: "journal_entry.provider_dispatch_started",
            event_hash: "h1",
            previous_event_hash: null,
            chain_index: 0,
            event_sequence: 1,
            aggregate_type: "journal_entry_execution",
            aggregate_id: executionId,
            occurred_at: "2026-08-28T11:00:00.000Z",
            recorded_at: "2026-08-28T11:00:00.000Z",
          },
          {
            event_id: "evt-verify",
            event_type: "journal_entry.verified",
            event_hash: "h2",
            previous_event_hash: "h1",
            chain_index: 1,
            event_sequence: 2,
            aggregate_type: "journal_entry_execution",
            aggregate_id: executionId,
            occurred_at: "2026-08-28T12:00:00.000Z",
            recorded_at: "2026-08-28T12:00:00.000Z",
          },
        ],
      }),
    ).not.toThrow();
  });

  it("fails closed on previous_event_hash adjacency breaks", () => {
    expect(() =>
      assertPatent6ChainReceiptCustody({
        executionId: "exec-1",
        events: [
          {
            event_id: "evt-1",
            event_type: "journal_entry.provider_posted",
            event_hash: "h1",
            previous_event_hash: null,
            chain_index: 0,
            event_sequence: 1,
            aggregate_type: "journal_entry_execution",
            aggregate_id: "exec-1",
            occurred_at: "t1",
            recorded_at: "t1",
          },
          {
            event_id: "evt-2",
            event_type: "journal_entry.verified",
            event_hash: "h2",
            previous_event_hash: "broken",
            chain_index: 1,
            event_sequence: 2,
            aggregate_type: "journal_entry_execution",
            aggregate_id: "exec-1",
            occurred_at: "t2",
            recorded_at: "t2",
          },
        ],
      }),
    ).toThrow(/previous_event_hash adjacency break/);
  });
});

describe("PR #310 ledger select static contract", () => {
  it("cockpit and inspection modules never select ledger_events.created_at", () => {
    const files = [
      "lib/journal-entry-governance/sandbox-je-cockpit-api.ts",
      "lib/journal-entry-governance/je3d-activation-inspection.ts",
    ];
    for (const file of files) {
      const src = fs.readFileSync(path.join(root, file), "utf8");
      expect(src).not.toMatch(/ledger_events[\s\S]*created_at/);
      expect(src).not.toContain('"created_at"');
    }
  });
});
