import { describe, test, expect } from "vitest";
import { sniffFormat } from "./sniff";

describe("sniffFormat", () => {
  test("EDI 820 by content", () => {
    const s =
      "ISA*00*          *00*          *ZZ*A*ZZ*B*260705*1430*U*00401*000000001*0*P*>~ST*820*0001~";
    expect(sniffFormat(s)).toBe("edi_820");
  });

  test("camt.054 by xmlns", () => {
    const s =
      '<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.08">';
    expect(sniffFormat(s)).toBe("iso20022_camt054");
  });

  test("camt.054 by root element", () => {
    expect(sniffFormat("<Document><BkToCstmrDbtCdtNtfctn/></Document>")).toBe("iso20022_camt054");
  });

  test("filename fallback", () => {
    expect(sniffFormat("random content", "payment-camt054.xml")).toBe("iso20022_camt054");
    expect(sniffFormat("random content", "batch.edi")).toBe("edi_820");
  });

  test("unknown returns null", () => {
    expect(sniffFormat("random plain text")).toBeNull();
  });
});
