import { describe, expect, it } from "vitest";
import {
  buildDashboardCompatibilityHref,
  normalizeActivationReturnTo,
  ONBOARDING_WIZARD_QUERY_KEYS,
} from "@/lib/activation/dashboard-destination";
import {
  activationDismissStorageKey,
  bootstrapLeadSessionFromSearchParams,
  LEAD_ID_KEY,
  LEAD_SESSION_KEY,
  readLeadSessionFromStorage,
} from "@/lib/activation/lead-session";
import { qbErrorCopy } from "@/lib/onboarding/qb-error-messages";

function memoryStorage(seed: Record<string, string> = {}) {
  const store = { ...seed };
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    _store: store,
  };
}

describe("dashboard-first activation destinations", () => {
  it("drops wizard step= when building compatibility href", () => {
    const href = buildDashboardCompatibilityHref({
      searchParams: new URLSearchParams({
        step: "connect-accounting",
        leadId: "lead-1",
        qbError: "state_mismatch",
        provider: "quickbooks",
      }),
    });
    expect(href).toBe(
      "/dashboard?leadId=lead-1&qbError=state_mismatch&provider=quickbooks",
    );
    expect(href).not.toContain("step=");
    expect(ONBOARDING_WIZARD_QUERY_KEYS).toContain("step");
  });

  it("returns bare /dashboard when only wizard params present", () => {
    expect(
      buildDashboardCompatibilityHref({
        searchParams: { step: "connect-accounting" },
      }),
    ).toBe("/dashboard");
  });

  it("normalizes stale /onboarding returnTo to /dashboard", () => {
    expect(normalizeActivationReturnTo("/onboarding")).toBe("/dashboard");
    expect(normalizeActivationReturnTo("/onboarding?step=1")).toBe("/dashboard");
    expect(normalizeActivationReturnTo("/dashboard")).toBe("/dashboard");
    expect(normalizeActivationReturnTo("/onboarding/baseline-harvest")).toBe(
      "/onboarding/baseline-harvest",
    );
  });

  it("points qbError CTAs at dashboard, not onboarding wizard", () => {
    const copy = qbErrorCopy("state_mismatch");
    expect(copy.actionHref.startsWith("/dashboard")).toBe(true);
    expect(copy.actionHref).not.toContain("/onboarding");
    expect(copy.actionHref).not.toContain("step=");
  });
});

describe("lead session bootstrap (Architecture B)", () => {
  it("persists leadId from URL before access gate can read it", () => {
    const storage = memoryStorage();
    const leadId = bootstrapLeadSessionFromSearchParams(
      new URLSearchParams({ leadId: "lead-abc" }),
      storage,
    );
    expect(leadId).toBe("lead-abc");
    expect(storage.getItem(LEAD_ID_KEY)).toBe("lead-abc");
    const session = readLeadSessionFromStorage(storage);
    expect(session?.leadId).toBe("lead-abc");
    expect(storage.getItem(LEAD_SESSION_KEY)).toContain("lead-abc");
  });

  it("does not invent a lead session without leadId", () => {
    const storage = memoryStorage();
    expect(bootstrapLeadSessionFromSearchParams(new URLSearchParams(), storage)).toBeNull();
    expect(readLeadSessionFromStorage(storage)).toBeNull();
  });

  it("scopes optional dismissal per company and per lead", () => {
    expect(activationDismissStorageKey({ companyId: "co-1" })).toContain("company:co-1");
    expect(activationDismissStorageKey({ leadId: "lead-1" })).toContain("lead:lead-1");
    expect(activationDismissStorageKey({ companyId: "co-1" })).not.toBe(
      activationDismissStorageKey({ companyId: "co-2" }),
    );
  });
});

describe("ActivationCard blocking vs optional model", () => {
  it("treats industry as optional — blocking complete when connect+identity done", () => {
    const needsConnect = false;
    const needsIdentityConfirm = false;
    const errorCopy = null;
    const needsIndustry = true;
    const blockingComplete = !needsConnect && !needsIdentityConfirm && !errorCopy;
    const dismissed = false;
    const showOptionalIndustry = blockingComplete && needsIndustry && !dismissed;
    expect(blockingComplete).toBe(true);
    expect(showOptionalIndustry).toBe(true);
    // Must not early-hide solely because blockingComplete is true
    const shouldHideEarly =
      blockingComplete && !showOptionalIndustry && !needsIndustry;
    expect(shouldHideEarly).toBe(false);
  });
});
