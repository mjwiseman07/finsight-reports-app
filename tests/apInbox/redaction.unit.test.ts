import { describe, it, expect } from "vitest";
import { redactBankLikeNumbers } from "@/lib/ap-intake/inbox/redaction";

describe("redaction", () => {
  it("redacts long numeric runs (bank/account/routing shaped)", () => {
    const out = redactBankLikeNumbers("Account 1234567890 routing 9876543");
    expect(out).not.toContain("1234567890");
    expect(out).not.toContain("9876543");
    expect(out).toContain("[REDACTED]");
  });

  it("keeps short numbers untouched", () => {
    expect(redactBankLikeNumbers("PO 12345 for $50")).toBe("PO 12345 for $50");
  });

  it("redacts IBAN-shaped values", () => {
    const out = redactBankLikeNumbers("IBAN GB29NWBK60161331926819 please");
    expect(out).toContain("[REDACTED]");
  });
});
