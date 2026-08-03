import { describe, it, expect } from "vitest";
import { buildPricingSignupUrl } from "@/lib/pricing/checkout-handlers";

describe("buildPricingSignupUrl — Track 4.5 Block B auth-first", () => {
  it("routes RA yearly standard for anonymous users", () => {
    const url = buildPricingSignupUrl({
      plan: "review_assist",
      cadence: "yearly",
      track: "standard",
      isAuthenticated: false,
    });
    expect(url).toBe(
      "/signup?persona=bookkeeper&plan=review_assist&cadence=yearly&track=standard",
    );
  });

  it("routes RA Pro monthly pilot for anonymous users", () => {
    const url = buildPricingSignupUrl({
      plan: "review_assist_pro",
      cadence: "monthly",
      track: "pilot",
      isAuthenticated: false,
    });
    expect(url).toBe(
      "/signup?persona=bookkeeper&plan=review_assist_pro&cadence=monthly&track=pilot",
    );
  });

  it("adds resume=1 for authenticated users", () => {
    const url = buildPricingSignupUrl({
      plan: "review_assist_pro",
      cadence: "yearly",
      track: "standard",
      isAuthenticated: true,
    });
    expect(url).toContain("resume=1");
    expect(url).toContain("plan=review_assist_pro");
    expect(url).toContain("cadence=yearly");
    expect(url).toContain("track=standard");
  });
});
