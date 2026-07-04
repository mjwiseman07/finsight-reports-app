import { describe, expect, it } from "vitest";
import {
  convertJeDraftToJEPayload,
  JeDraftConversionError,
} from "@/lib/pre-close/je-draft-to-je-payload";
import type { JEDraft } from "@/lib/pre-close/types";

function draft(lines: JEDraft["lines"]): JEDraft {
  return { narration: "Test narration", transactionDate: "2026-07-06", lines };
}

describe("je-draft-to-je-payload convertJeDraftToJEPayload", () => {
  it("happy path: 2-line balanced draft converts cents to dollars", () => {
    const payload = convertJeDraftToJEPayload(
      draft([
        { lineIndex: 0, accountId: "6000", accountName: "Rent", drAmountCents: 10000, crAmountCents: 0, memo: "" },
        { lineIndex: 1, accountId: "1000", accountName: "Cash", drAmountCents: 0, crAmountCents: 10000, memo: "" },
      ]),
    );
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines[0].amount).toBe(100);
    expect(payload.lines[0].posting_type).toBe("Debit");
    expect(payload.lines[1].amount).toBe(100);
    expect(payload.lines[1].posting_type).toBe("Credit");
  });

  it("3-line balanced draft with mixed splits", () => {
    const payload = convertJeDraftToJEPayload(
      draft([
        { lineIndex: 0, accountId: "1", accountName: "A", drAmountCents: 5000, crAmountCents: 0, memo: "" },
        { lineIndex: 1, accountId: "2", accountName: "B", drAmountCents: 5000, crAmountCents: 0, memo: "" },
        { lineIndex: 2, accountId: "3", accountName: "C", drAmountCents: 0, crAmountCents: 10000, memo: "" },
      ]),
    );
    expect(payload.lines).toHaveLength(3);
    expect(payload.lines[2].amount).toBe(100);
  });

  it("throws on empty lines", () => {
    expect(() => convertJeDraftToJEPayload(draft([]))).toThrow(JeDraftConversionError);
  });

  it("throws on 1-line draft", () => {
    expect(() =>
      convertJeDraftToJEPayload(
        draft([{ lineIndex: 0, accountId: "1", accountName: "A", drAmountCents: 100, crAmountCents: 0, memo: "" }]),
      ),
    ).toThrow(JeDraftConversionError);
  });

  it("throws on mixed dr+cr line", () => {
    expect(() =>
      convertJeDraftToJEPayload(
        draft([
          { lineIndex: 0, accountId: "1", accountName: "A", drAmountCents: 100, crAmountCents: 50, memo: "" },
          { lineIndex: 1, accountId: "2", accountName: "B", drAmountCents: 0, crAmountCents: 50, memo: "" },
        ]),
      ),
    ).toThrow(JeDraftConversionError);
  });

  it("throws on zero-amount line", () => {
    expect(() =>
      convertJeDraftToJEPayload(
        draft([
          { lineIndex: 0, accountId: "1", accountName: "A", drAmountCents: 0, crAmountCents: 0, memo: "" },
          { lineIndex: 1, accountId: "2", accountName: "B", drAmountCents: 0, crAmountCents: 100, memo: "" },
        ]),
      ),
    ).toThrow(JeDraftConversionError);
  });

  it("preserves narration and transactionDate verbatim", () => {
    const payload = convertJeDraftToJEPayload(
      draft([
        { lineIndex: 0, accountId: "1", accountName: "A", drAmountCents: 100, crAmountCents: 0, memo: "" },
        { lineIndex: 1, accountId: "2", accountName: "B", drAmountCents: 0, crAmountCents: 100, memo: "" },
      ]),
    );
    expect(payload.narration).toBe("Test narration");
    expect(payload.transaction_date).toBe("2026-07-06");
  });

  it("applies privateNote and currency options", () => {
    const payload = convertJeDraftToJEPayload(
      draft([
        { lineIndex: 0, accountId: "1", accountName: "A", drAmountCents: 100, crAmountCents: 0, memo: "" },
        { lineIndex: 1, accountId: "2", accountName: "B", drAmountCents: 0, crAmountCents: 100, memo: "" },
      ]),
      { privateNote: "note", currency: "CAD" },
    );
    expect(payload.private_note).toBe("note");
    expect(payload.currency).toBe("CAD");
  });

  it("defaults currency to USD", () => {
    const payload = convertJeDraftToJEPayload(
      draft([
        { lineIndex: 0, accountId: "1", accountName: "A", drAmountCents: 100, crAmountCents: 0, memo: "" },
        { lineIndex: 1, accountId: "2", accountName: "B", drAmountCents: 0, crAmountCents: 100, memo: "" },
      ]),
    );
    expect(payload.currency).toBe("USD");
  });

  it("cents to dollars precision: 12345 cents -> 123.45", () => {
    const payload = convertJeDraftToJEPayload(
      draft([
        { lineIndex: 0, accountId: "1", accountName: "A", drAmountCents: 12345, crAmountCents: 0, memo: "" },
        { lineIndex: 1, accountId: "2", accountName: "B", drAmountCents: 0, crAmountCents: 12345, memo: "" },
      ]),
    );
    expect(payload.lines[0].amount).toBe(123.45);
  });
});
