import { describe, expect, it } from "vitest";
import {
  buildDashboardCompatibilityHref,
  normalizeActivationReturnTo,
  ONBOARDING_WIZARD_QUERY_KEYS,
} from "@/lib/activation/dashboard-destination";
import { qbErrorCopy } from "@/lib/onboarding/qb-error-messages";

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
