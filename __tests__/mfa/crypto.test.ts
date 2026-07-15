import { describe, expect, it } from "vitest";
import {
  generateRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/mfa/crypto";

describe("mfa crypto", () => {
  it("generateRecoveryCode returns 19-char formatted string", () => {
    const code = generateRecoveryCode();
    expect(code).toHaveLength(19);
    expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it("hashRecoveryCode is deterministic", () => {
    const a = hashRecoveryCode("ABCD-EF01-2345-6789");
    const b = hashRecoveryCode("ABCD-EF01-2345-6789");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("hashRecoveryCode strips dashes and uppercases before hashing", () => {
    const withDashes = hashRecoveryCode("abcd-ef01-2345-6789");
    const compact = hashRecoveryCode("ABCDEF0123456789");
    const mixed = hashRecoveryCode("AbCd-Ef01-2345-6789");
    expect(withDashes).toBe(compact);
    expect(mixed).toBe(compact);
  });

  it("generateRecoveryCodes(10) returns 10 unique codes", () => {
    const { plaintext, hashes } = generateRecoveryCodes(10);
    expect(plaintext).toHaveLength(10);
    expect(hashes).toHaveLength(10);
    expect(new Set(plaintext).size).toBe(10);
    expect(new Set(hashes).size).toBe(10);
  });
});
