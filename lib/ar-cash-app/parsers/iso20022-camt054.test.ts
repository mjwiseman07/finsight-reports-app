import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseCamt054, Camt054ParseError } from "./iso20022-camt054";

const fixture = readFileSync(
  path.join(__dirname, "__fixtures__/camt054-sample.xml"),
  "utf8",
);

describe("parseCamt054", () => {
  test("extracts message id", () => {
    const r = parseCamt054(fixture);
    expect(r.messageId).toBe("ADVISACOR-20260705-0001");
  });

  test("only returns CRDT entries (skips DBIT)", () => {
    const r = parseCamt054(fixture);
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].amount).toBe(1250);
    expect(r.entries[0].currency).toBe("USD");
  });

  test("extracts debtor name and structured refs", () => {
    const r = parseCamt054(fixture);
    const e = r.entries[0];
    expect(e.debtorName).toBe("ACME CORPORATION");
    expect(e.invoiceReferences).toEqual(["INV-4521", "INV-4522"]);
    expect(e.unstructuredRemittance).toEqual(["Payment for INV-4521 and INV-4522"]);
  });

  test("empty input throws", () => {
    expect(() => parseCamt054("")).toThrow(Camt054ParseError);
  });

  test("missing root throws", () => {
    expect(() => parseCamt054("<Document/>")).toThrow(/Missing/);
  });
});
