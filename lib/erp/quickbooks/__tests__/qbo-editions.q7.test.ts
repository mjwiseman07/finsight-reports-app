import { describe, expect, it } from "vitest";
import {
  QBO_EDITION_CAPABILITIES,
  capabilityForEdition,
  parseOfferingSku,
  parseSubscriptionStatus,
  subscriptionAllowsWrites,
} from "@/lib/erp/quickbooks/qbo-editions";

describe("Phase Q7 — parseOfferingSku", () => {
  it("parses the four supported editions strictly", () => {
    expect(parseOfferingSku("QuickBooks Online Simple Start")).toBe("simple_start");
    expect(parseOfferingSku("QuickBooks Online Essentials")).toBe("essentials");
    expect(parseOfferingSku("QuickBooks Online Plus")).toBe("plus");
    expect(parseOfferingSku("QuickBooks Online Advanced")).toBe("advanced");
  });
  it("returns null for unknown or empty SKUs", () => {
    expect(parseOfferingSku(null)).toBeNull();
    expect(parseOfferingSku(undefined)).toBeNull();
    expect(parseOfferingSku("")).toBeNull();
    expect(parseOfferingSku("QuickBooks Online Ledger")).toBeNull();
    expect(parseOfferingSku("QuickBooks Online EasyStart")).toBeNull();
  });
});

describe("Phase Q7 — parseSubscriptionStatus", () => {
  it("normalizes Intuit values to lowercase snake", () => {
    expect(parseSubscriptionStatus("TRIAL")).toBe("trial");
    expect(parseSubscriptionStatus("TRIALOPTIN")).toBe("trialoptin");
    expect(parseSubscriptionStatus("SUBSCRIBED")).toBe("subscribed");
    expect(parseSubscriptionStatus("EXPIRED")).toBe("expired");
    expect(parseSubscriptionStatus("RESTRICTED")).toBe("restricted");
    expect(parseSubscriptionStatus("SUSPENDED")).toBe("suspended");
    expect(parseSubscriptionStatus("CANCELLED")).toBe("cancelled");
  });
  it("returns 'unknown' for null / unrecognized values", () => {
    expect(parseSubscriptionStatus(null)).toBe("unknown");
    expect(parseSubscriptionStatus(undefined)).toBe("unknown");
    expect(parseSubscriptionStatus("")).toBe("unknown");
    expect(parseSubscriptionStatus("UNKNOWN")).toBe("unknown");
    expect(parseSubscriptionStatus("weird_value")).toBe("unknown");
  });
});

describe("Phase Q7 — subscriptionAllowsWrites", () => {
  it("permits writes only for TRIAL/TRIALOPTIN/SUBSCRIBED", () => {
    expect(subscriptionAllowsWrites("trial")).toBe(true);
    expect(subscriptionAllowsWrites("trialoptin")).toBe(true);
    expect(subscriptionAllowsWrites("subscribed")).toBe(true);
  });
  it("blocks writes for all other statuses", () => {
    expect(subscriptionAllowsWrites("expired")).toBe(false);
    expect(subscriptionAllowsWrites("restricted")).toBe(false);
    expect(subscriptionAllowsWrites("suspended")).toBe(false);
    expect(subscriptionAllowsWrites("cancelled")).toBe(false);
    expect(subscriptionAllowsWrites("unknown")).toBe(false);
  });
});

describe("Phase Q7 — capabilityForEdition (fail-closed)", () => {
  it("permits journal_entry_write on every edition", () => {
    for (const edition of Object.keys(QBO_EDITION_CAPABILITIES)) {
      expect(capabilityForEdition(edition as never, "journal_entry_write")).toBe(true);
    }
  });
  it("blocks multicurrency on simple_start; allows on essentials/plus/advanced", () => {
    expect(capabilityForEdition("simple_start", "multicurrency")).toBe(false);
    expect(capabilityForEdition("essentials", "multicurrency")).toBe(true);
    expect(capabilityForEdition("plus", "multicurrency")).toBe(true);
    expect(capabilityForEdition("advanced", "multicurrency")).toBe(true);
  });
  it("gates classes/locations/budgets to plus and advanced only", () => {
    for (const cap of ["classes", "locations", "budgets_read"] as const) {
      expect(capabilityForEdition("simple_start", cap)).toBe(false);
      expect(capabilityForEdition("essentials", cap)).toBe(false);
      expect(capabilityForEdition("plus", cap)).toBe(true);
      expect(capabilityForEdition("advanced", cap)).toBe(true);
    }
  });
  it("treats NULL edition as simple_start (fail-closed)", () => {
    expect(capabilityForEdition(null, "journal_entry_write")).toBe(true);
    expect(capabilityForEdition(null, "multicurrency")).toBe(false);
    expect(capabilityForEdition(null, "classes")).toBe(false);
    expect(capabilityForEdition(undefined, "locations")).toBe(false);
  });
});
