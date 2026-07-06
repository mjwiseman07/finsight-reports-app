import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseEdi820, Edi820ParseError } from "./edi-820";

const fixture = readFileSync(
  path.join(__dirname, "__fixtures__/edi-820-sample.edi"),
  "utf8",
);

describe("parseEdi820", () => {
  test("parses ISA control and BPR total", () => {
    const result = parseEdi820(fixture);
    expect(result.isaControlNumber).toBe("000000001");
    expect(result.bprAmountTotal).toBe(1250);
    expect(result.trnTraceNumber).toBe("ACHREF0001");
  });

  test("extracts payer name from N1*PR", () => {
    const result = parseEdi820(fixture);
    expect(result.payerName).toBe("ACME CORPORATION");
  });

  test("emits one RemittanceLine per RMR", () => {
    const result = parseEdi820(fixture);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].invoiceReference).toBe("INV-4521");
    expect(result.lines[0].amountPaid).toBe(750);
    expect(result.lines[0].paymentDateHint).toBe("2026-06-15");
    expect(result.lines[1].invoiceReference).toBe("INV-4522");
    expect(result.lines[1].amountPaid).toBe(500);
  });

  test("sum of line amounts equals BPR total", () => {
    const result = parseEdi820(fixture);
    const lineSum = result.lines.reduce((s, l) => s + l.amountPaid, 0);
    expect(lineSum).toBe(result.bprAmountTotal);
  });

  test("empty input throws", () => {
    expect(() => parseEdi820("")).toThrow(Edi820ParseError);
  });

  test("missing BPR throws", () => {
    const bad =
      "ISA*00*          *00*          *ZZ*A*ZZ*B*260705*1430*U*00401*000000001*0*P*>~SE*1*0001~";
    expect(() => parseEdi820(bad)).toThrow(/Missing BPR/);
  });
});
