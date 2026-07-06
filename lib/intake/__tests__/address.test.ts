import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  parseIntakeAddress,
  deriveToken,
  verifyToken,
  buildFullAddress,
  isValidFirmSlug,
  KNOWN_HANDLER_PREFIXES,
} from "../address";

const ORIGINAL_SECRET = process.env.INTAKE_ADDRESS_TOKEN_SECRET;

beforeEach(() => {
  process.env.INTAKE_ADDRESS_TOKEN_SECRET = "test-secret-please-rotate-in-prod-abc1234567890";
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.INTAKE_ADDRESS_TOKEN_SECRET;
  } else {
    process.env.INTAKE_ADDRESS_TOKEN_SECRET = ORIGINAL_SECRET;
  }
});

describe("parseIntakeAddress", () => {
  test("parses full plus-addressed recipient", () => {
    const parsed = parseIntakeAddress("bills+acme-corp-a7f3k2@intake.advisacor.com");
    expect(parsed).toEqual({
      prefix: "bills",
      firmSlug: "acme-corp",
      token: "a7f3k2",
      domain: "intake.advisacor.com",
    });
  });

  test("parses remit prefix for cash_app_remit handler", () => {
    const parsed = parseIntakeAddress("remit+acme-a7f3k2@intake.advisacor.com");
    expect(parsed?.prefix).toBe("remit");
    expect(KNOWN_HANDLER_PREFIXES.remit).toBe("cash_app_remit");
  });

  test("parses bare intake@ address without slug or token", () => {
    const parsed = parseIntakeAddress("intake@intake.advisacor.com");
    expect(parsed).toEqual({
      prefix: "intake",
      firmSlug: null,
      token: null,
      domain: "intake.advisacor.com",
    });
  });

  test("parses plus without hyphen token segment", () => {
    const parsed = parseIntakeAddress("docs+acmeonly@intake.advisacor.com");
    expect(parsed).toEqual({
      prefix: "docs",
      firmSlug: "acmeonly",
      token: null,
      domain: "intake.advisacor.com",
    });
  });

  test("normalizes casing and whitespace", () => {
    const parsed = parseIntakeAddress("  BILLS+Acme-Corp-ABC123@INTAKE.ADVISACOR.COM  ");
    expect(parsed?.prefix).toBe("bills");
    expect(parsed?.firmSlug).toBe("acme-corp");
    expect(parsed?.token).toBe("abc123");
  });

  test("returns null for non-intake domain", () => {
    expect(parseIntakeAddress("bills+acme@example.com")).toBeNull();
  });

  test("returns null when @ is missing", () => {
    expect(parseIntakeAddress("not-an-email")).toBeNull();
  });

  test("handles multiple hyphens in slug portion", () => {
    const parsed = parseIntakeAddress("remit+acme-corp-llc-xyz789@intake.advisacor.com");
    expect(parsed?.firmSlug).toBe("acme-corp-llc");
    expect(parsed?.token).toBe("xyz789");
  });
});

describe("deriveToken + verifyToken", () => {
  test("deriveToken is deterministic for same inputs", () => {
    const a = deriveToken("cash_app_remit", "acme", "co-111");
    const b = deriveToken("cash_app_remit", "acme", "co-111");
    expect(a).toBe(b);
    expect(a).toHaveLength(6);
  });

  test("deriveToken differs across handlers", () => {
    const remit = deriveToken("cash_app_remit", "acme", "co-111");
    const bills = deriveToken("bills", "acme", "co-111");
    expect(remit).not.toBe(bills);
  });

  test("verifyToken accepts matching token", () => {
    const token = deriveToken("docs", "acme", "co-222");
    expect(verifyToken("docs", "acme", "co-222", token)).toBe(true);
  });

  test("verifyToken rejects wrong token", () => {
    const token = deriveToken("docs", "acme", "co-222");
    expect(verifyToken("docs", "acme", "co-222", "000000")).toBe(false);
  });

  test("verifyToken rejects wrong length", () => {
    expect(verifyToken("docs", "acme", "co-222", "abc")).toBe(false);
    expect(verifyToken("docs", "acme", "co-222", "")).toBe(false);
  });

  test("deriveToken throws when secret missing", () => {
    delete process.env.INTAKE_ADDRESS_TOKEN_SECRET;
    expect(() => deriveToken("bills", "acme", "co-1")).toThrow(/INTAKE_ADDRESS_TOKEN_SECRET/);
  });
});

describe("buildFullAddress", () => {
  test("builds remit address for cash_app_remit", () => {
    expect(buildFullAddress("cash_app_remit", "acme", "a7f3k2")).toBe(
      "remit+acme-a7f3k2@intake.advisacor.com",
    );
  });

  test("builds bills address", () => {
    expect(buildFullAddress("bills", "acme", "b1c2d3")).toBe(
      "bills+acme-b1c2d3@intake.advisacor.com",
    );
  });
});

describe("isValidFirmSlug", () => {
  test("accepts valid slugs", () => {
    expect(isValidFirmSlug("acme")).toBe(true);
    expect(isValidFirmSlug("acme-corp")).toBe(true);
    expect(isValidFirmSlug("a1b")).toBe(true);
  });

  test("rejects invalid slugs", () => {
    expect(isValidFirmSlug("")).toBe(false);
    expect(isValidFirmSlug("A")).toBe(false);
    expect(isValidFirmSlug("-acme")).toBe(false);
    expect(isValidFirmSlug("acme-")).toBe(false);
    expect(isValidFirmSlug("a".repeat(33))).toBe(false);
    expect(isValidFirmSlug("has spaces")).toBe(false);
  });
});
