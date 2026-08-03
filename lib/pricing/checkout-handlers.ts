/**
 * Track 4.5 Block B — auth-first pricing → signup URL builders.
 * Extracted so unit tests cover routing without mounting the pricing page.
 */

export type PricingPlan = "review_assist" | "review_assist_pro";
export type PricingCadence = "monthly" | "yearly";
export type PricingTrack = "pilot" | "standard";

export function buildPricingSignupUrl(params: {
  plan: PricingPlan;
  cadence: PricingCadence;
  track: PricingTrack;
  isAuthenticated: boolean;
}): string {
  const search = new URLSearchParams({
    persona: "bookkeeper",
    plan: params.plan,
    cadence: params.cadence,
    track: params.track,
  });
  if (params.isAuthenticated) {
    search.set("resume", "1");
  }
  return `/signup?${search.toString()}`;
}
