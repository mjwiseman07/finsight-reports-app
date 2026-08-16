import { describe, expect, it } from "vitest";
import {
  buildDashboardCompatibilityHref,
  normalizeActivationReturnTo,
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
  });

  it("normalizes stale /onboarding returnTo to /dashboard", () => {
    expect(normalizeActivationReturnTo("/onboarding")).toBe("/dashboard");
    expect(normalizeActivationReturnTo("/onboarding/baseline-harvest")).toBe(
      "/onboarding/baseline-harvest",
    );
  });

  it("points qbError CTAs at dashboard", () => {
    expect(qbErrorCopy("state_mismatch").actionHref.startsWith("/dashboard")).toBe(true);
  });
});
