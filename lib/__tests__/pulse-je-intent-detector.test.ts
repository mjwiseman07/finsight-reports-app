/**
 * PULSE-JE-1 — intent detector unit smoke (no QBO).
 */
import { describe, expect, it } from "vitest";
import { detectJournalEntryIntent } from "../pulse-je/intent-detector";

describe("detectJournalEntryIntent", () => {
  it("detects move from/to with amount", () => {
    const s = detectJournalEntryIntent("Move $5,138.29 from Taxes to Accounting Fees");
    expect(s.kind).toBe("reclass");
    expect(s.confidence).toBeGreaterThanOrEqual(0.7);
    expect(s.hints.amount).toBe(5138.29);
    expect(s.hints.from_account_phrase).toBe("Taxes");
    expect(s.hints.to_account_phrase).toBe("Accounting Fees");
  });

  it("returns insufficient-style unclear for bare JE ask", () => {
    const s = detectJournalEntryIntent("Please make a journal entry");
    expect(s.kind).toBe("unclear");
    expect(s.confidence).toBe(0);
  });
});
