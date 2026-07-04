import { describe, expect, it, vi, beforeEach } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";
import { canonicalize, snapshotCoverageStatement } from "@/lib/close-packet/assertion-coverage-snapshot";
import { makeSyntheticStatement } from "./_fixtures/statement";

const mock = makeMockDb();

describe("canonicalize", () => {
  it("sorts object keys", () => {
    const out = canonicalize({ z: 1, a: 2 });
    expect(out).toBe('{"a":2,"z":1}');
  });

  it("preserves array order", () => {
    const out = canonicalize([3, 1, 2]);
    expect(out).toBe("[3,1,2]");
  });

  it("handles nested objects", () => {
    const out = canonicalize({ b: { y: 1, x: 2 }, a: 1 });
    expect(out).toContain('"a":1');
    expect(out.indexOf('"a"')).toBeLessThan(out.indexOf('"b"'));
  });

  it("handles null and primitives", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(42)).toBe("42");
    expect(canonicalize("x")).toBe('"x"');
  });
});

describe("snapshotCoverageStatement", () => {
  beforeEach(() => mock.__reset());

  it("inserts with correct summary counts", async () => {
    const statement = makeSyntheticStatement({
      summary: {
        total_cells: 4,
        tested: 1,
        partial: 1,
        gap: 1,
        not_applicable: 1,
        gaps_by_root_cause: {},
        coverage_rate_pct: 50,
        critical_gaps: 1,
      },
    });
    const result = await snapshotCoverageStatement({
      supabase: mock as never,
      closePacketId: "pkt1",
      closePeriodId: "cp1",
      firmClientId: "fc1",
      packetVersion: 1,
      statement,
    });
    expect(result.snapshot_id).toBeDefined();
    const row = mock.__state.assertion_coverage_statement_versions[0];
    expect(row.gap_count).toBe(1);
    expect(row.tested_count).toBe(1);
    expect(row.partial_count).toBe(1);
    expect(row.not_applicable_count).toBe(1);
    expect(row.coverage_row_count).toBe(4);
  });

  it("computes sha256 deterministically", async () => {
    const statement = makeSyntheticStatement();
    const a = await snapshotCoverageStatement({
      supabase: mock as never,
      closePacketId: "pkt1",
      closePeriodId: "cp1",
      firmClientId: "fc1",
      packetVersion: 1,
      statement,
    });
    mock.__reset();
    const b = await snapshotCoverageStatement({
      supabase: mock as never,
      closePacketId: "pkt2",
      closePeriodId: "cp1",
      firmClientId: "fc1",
      packetVersion: 1,
      statement,
    });
    expect(a.content_sha256).toBe(b.content_sha256);
    expect(a.content_sha256).toHaveLength(64);
  });

  it("returns existing row on unique-violation retry", async () => {
    const statement = makeSyntheticStatement();
    const first = await snapshotCoverageStatement({
      supabase: mock as never,
      closePacketId: "pkt1",
      closePeriodId: "cp1",
      firmClientId: "fc1",
      packetVersion: 1,
      statement,
    });
    const second = await snapshotCoverageStatement({
      supabase: mock as never,
      closePacketId: "pkt1",
      closePeriodId: "cp1",
      firmClientId: "fc1",
      packetVersion: 1,
      statement: makeSyntheticStatement({ generated_at: "2026-07-02T00:00:00.000Z" }),
    });
    expect(second.snapshot_id).toBe(first.snapshot_id);
    expect(mock.__state.assertion_coverage_statement_versions).toHaveLength(1);
  });

  it("throws on non-unique-violation error", async () => {
    const broken = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "boom", code: "XX000" } }),
          }),
        }),
      }),
    };
    await expect(
      snapshotCoverageStatement({
        supabase: broken as never,
        closePacketId: "pkt1",
        closePeriodId: "cp1",
        firmClientId: "fc1",
        packetVersion: 1,
        statement: makeSyntheticStatement(),
      }),
    ).rejects.toThrow(/snapshotCoverageStatement failed/);
  });
});
