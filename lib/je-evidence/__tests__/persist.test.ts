import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JeCompositionResult } from "@/lib/je-evidence/types";
import { JeEvidenceContractError } from "@/lib/je-evidence/contract";
import { persistJeEvidence } from "@/lib/je-evidence/persist";

function threeLineComposition(): JeCompositionResult {
  return {
    transactionDate: "2026-06-30",
    narration: "AP accrual test",
    sourceType: "rule",
    sourceId: "prop-1",
    lines: [
      {
        lineIndex: 0,
        accountId: "42",
        accountName: "Accrued Expenses",
        drAmount: 500,
        crAmount: 0,
        evidence: {
          evidenceType: "qbo_bill",
          sourceType: "qbo_bill",
          sourceId: "bill-99",
          sourceKey: { vendor_canonical: "Acme Corp", invoice_number: "INV-4471" },
          sourceAmount: 500,
          sourceDate: "2026-06-28",
          evidenceSummary: "QBO Bill #4471 from Acme Corp",
        },
      },
      {
        lineIndex: 1,
        accountId: "60",
        accountName: "Office Supplies",
        drAmount: 0,
        crAmount: 250,
        evidence: {
          evidenceType: "memory_pattern",
          sourceType: "memory_record",
          sourceId: "mem_vendor_gl_42",
          evidenceSummary: "Learned GL mapping for Acme Corp",
        },
      },
      {
        lineIndex: 2,
        accountId: "61",
        accountName: "Utilities",
        drAmount: 0,
        crAmount: 250,
        evidence: {
          evidenceType: "qbo_bill",
          sourceType: "qbo_bill",
          sourceId: "bill-100",
          sourceKey: { vendor_canonical: "Utility Co" },
          evidenceSummary: "QBO Bill utility accrual",
        },
      },
    ],
  };
}

function createMockDb(
  data: { evidence_id: string }[] = [],
): { db: { from: ReturnType<typeof vi.fn> }; insertMock: ReturnType<typeof vi.fn> } {
  const insertMock = vi.fn();
  const selectMock = vi.fn().mockResolvedValue({ data, error: null });
  insertMock.mockReturnValue({ select: selectMock });
  const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
  return { db: { from: fromMock }, insertMock };
}

describe("persistJeEvidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists 3-line composition with correct attempt_id, line_index, content_hash, source_key", async () => {
    const { db, insertMock } = createMockDb([
      { evidence_id: "ev-0" },
      { evidence_id: "ev-1" },
      { evidence_id: "ev-2" },
    ]);

    const ids = await persistJeEvidence({
      db: db as never,
      attemptId: "attempt-1",
      firmClientId: "client-1",
      composition: threeLineComposition(),
    });

    expect(ids).toEqual(["ev-0", "ev-1", "ev-2"]);
    const rows = insertMock.mock.calls[0][0];
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      attempt_id: "attempt-1",
      firm_client_id: "client-1",
      line_index: 0,
      source_key: { vendor_canonical: "Acme Corp", invoice_number: "INV-4471" },
    });
    expect(rows[0].content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[1].line_index).toBe(1);
    expect(rows[2].line_index).toBe(2);
  });

  it("allows multiple persists for same attempt_id with different line_index values", async () => {
    const { db, insertMock } = createMockDb([
      { evidence_id: "ev-a" },
      { evidence_id: "ev-b" },
    ]);

    const base = threeLineComposition();
    const twoLine = {
      ...base,
      lines: base.lines.slice(0, 2).map((l, i) => ({
        ...l,
        lineIndex: i,
        drAmount: i === 0 ? 250 : 0,
        crAmount: i === 0 ? 0 : 250,
      })),
    };

    await persistJeEvidence({
      db: db as never,
      attemptId: "attempt-1",
      firmClientId: "client-1",
      composition: twoLine,
    });
    await persistJeEvidence({
      db: db as never,
      attemptId: "attempt-1",
      firmClientId: "client-1",
      composition: {
        ...twoLine,
        lines: twoLine.lines.map((l) => ({ ...l, lineIndex: l.lineIndex + 10 })),
      },
    });

    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("throws on contract violation before any DB write", async () => {
    const { db, insertMock } = createMockDb();
    const bad = threeLineComposition();
    bad.lines = [bad.lines[0]];

    await expect(
      persistJeEvidence({
        db: db as never,
        attemptId: "attempt-1",
        firmClientId: "client-1",
        composition: bad,
      }),
    ).rejects.toBeInstanceOf(JeEvidenceContractError);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("produces deterministic content_hash for identical composition input", async () => {
    const hashes: string[] = [];
    const insertMock = vi.fn().mockImplementation((rows: { content_hash: string }[]) => {
      hashes.push(...rows.map((r) => r.content_hash));
      return {
        select: vi.fn().mockResolvedValue({
          data: rows.map((_, i) => ({ evidence_id: `ev-${i}` })),
          error: null,
        }),
      };
    });
    const db = { from: vi.fn().mockReturnValue({ insert: insertMock }) };

    const composition = threeLineComposition();
    await persistJeEvidence({
      db: db as never,
      attemptId: "attempt-hash",
      firmClientId: "client-1",
      composition,
    });
    await persistJeEvidence({
      db: db as never,
      attemptId: "attempt-hash",
      firmClientId: "client-1",
      composition,
    });

    expect(hashes[0]).toBe(hashes[3]);
    expect(hashes[1]).toBe(hashes[4]);
    expect(hashes[2]).toBe(hashes[5]);
  });
});
