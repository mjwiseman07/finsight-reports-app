import { describe, it, expect } from "vitest";
import { isValidFirmSlug } from "@/lib/intake/address";
import { resolveSlug } from "@/lib/intake/resolve-slug";

describe("resolveSlug", () => {
  it("returns the persisted slug when valid", () => {
    const s = resolveSlug({
      slug: "acme-inc",
      name: "Something Else",
      company_id: "abc-def",
    });
    expect(s).toBe("acme-inc");
  });

  it("falls back to name-derived slug when column is NULL", () => {
    const s = resolveSlug({
      slug: null,
      name: "Northstar Manufacturing",
      company_id: "xxx",
    });
    expect(s).toBe("northstar-manufacturing");
  });

  it("uses co-{companyId} fallback when name yields no valid slug", () => {
    const s = resolveSlug({
      slug: null,
      name: "!!",
      company_id: "abcdef01-2345-6789-abcd-ef0123456789",
    });
    expect(s).toBe("co-abcdef01");
    expect(isValidFirmSlug(s!)).toBe(true);
  });

  it("returns null when both slug column and name-derivation fail", () => {
    const s = resolveSlug({ slug: null, name: "", company_id: "" });
    expect(s).toBeNull();
  });
});
