import { describe, it, expect } from "vitest";
import { buildTsq, sha256, TSA_ENDPOINTS } from "../rfc3161-client";

describe("rfc3161-client", () => {
  it("buildTsq produces non-empty DER for a 32-byte digest", () => {
    const digest = sha256(new TextEncoder().encode("hello"));
    const nonce = new Uint8Array(16);
    for (let i = 0; i < 16; i++) nonce[i] = i;
    const tsq = buildTsq(digest, nonce);
    expect(tsq.length).toBeGreaterThan(30);
    // DER TimeStampReq starts with SEQUENCE tag 0x30
    expect(tsq[0]).toBe(0x30);
  });

  it("buildTsq rejects wrong-length digest", () => {
    expect(() => buildTsq(new Uint8Array(16), new Uint8Array(4))).toThrow();
  });

  it("endpoints list contains DigiCert + Sectigo", () => {
    const names = TSA_ENDPOINTS.map((e) => e.name);
    expect(names).toContain("digicert");
    expect(names).toContain("sectigo");
  });
});
