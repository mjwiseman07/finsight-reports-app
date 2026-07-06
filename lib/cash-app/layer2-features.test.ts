import { describe, test, expect } from "vitest";
import {
  fuzzyPayerNameScore,
  amountToleranceScore,
  dateProximityScore,
  historicalPayerBehaviorScore,
  globalPatternScore,
  computeLayer2FeatureScore,
} from "./layer2-features";

describe("fuzzyPayerNameScore", () => {
  test("identical names score 1.0", () => {
    expect(fuzzyPayerNameScore("Acme Corp", "Acme Corp")).toBeCloseTo(1.0, 2);
  });
  test("minor truncation scores high", () => {
    expect(
      fuzzyPayerNameScore("Fisher Scientific Co", "Fisher Scientific Company"),
    ).toBeGreaterThan(0.85);
  });
  test("completely different names score low", () => {
    expect(fuzzyPayerNameScore("Acme Corp", "Zephyr Industries")).toBeLessThan(0.5);
  });
  test("null payer name returns 0", () => {
    expect(fuzzyPayerNameScore(null, "Acme Corp")).toBe(0);
  });
  test("null customer name returns 0", () => {
    expect(fuzzyPayerNameScore("Acme Corp", null)).toBe(0);
  });
  test("case-insensitive via normalization", () => {
    expect(fuzzyPayerNameScore("ACME CORP", "acme corp")).toBeCloseTo(1.0, 2);
  });
});

describe("amountToleranceScore", () => {
  test("exact match scores 1.0", () => {
    expect(amountToleranceScore(1000, 1000)).toBe(1.0);
  });
  test("within 5% scores 1.0", () => {
    expect(amountToleranceScore(1049, 1000)).toBe(1.0);
  });
  test("exactly at 30% scores 0.0", () => {
    expect(amountToleranceScore(1300, 1000)).toBe(0.0);
  });
  test("beyond 30% floors at 0.0", () => {
    expect(amountToleranceScore(2000, 1000)).toBe(0.0);
  });
  test("midpoint (17.5% deviation) scores approximately 0.5", () => {
    expect(amountToleranceScore(1175, 1000)).toBeCloseTo(0.5, 1);
  });
  test("zero invoice balance returns 0", () => {
    expect(amountToleranceScore(1000, 0)).toBe(0);
  });
  test("negative deviation (underpayment) treated symmetrically", () => {
    expect(amountToleranceScore(700, 1000)).toBe(0.0);
  });
});

describe("dateProximityScore", () => {
  test("same date scores 1.0", () => {
    expect(dateProximityScore("2026-07-05", "2026-07-05")).toBe(1.0);
  });
  test("within 30 days scores 1.0", () => {
    expect(dateProximityScore("2026-07-05", "2026-06-10")).toBe(1.0);
  });
  test("exactly at 120 days scores 0.0", () => {
    expect(dateProximityScore("2026-11-02", "2026-07-05")).toBeCloseTo(0.0, 1);
  });
  test("beyond 120 days floors at 0.0", () => {
    expect(dateProximityScore("2027-07-05", "2026-07-05")).toBe(0.0);
  });
  test("midpoint (75 days) scores approximately 0.5", () => {
    expect(dateProximityScore("2026-09-18", "2026-07-05")).toBeCloseTo(0.5, 1);
  });
  test("invalid date returns 0", () => {
    expect(dateProximityScore("not-a-date", "2026-07-05")).toBe(0);
  });
  test("payment before invoice date still scores by absolute distance", () => {
    expect(dateProximityScore("2026-06-20", "2026-07-05")).toBe(1.0);
  });
});

describe("historicalPayerBehaviorScore", () => {
  test("no prior signal scores 0", () => {
    expect(
      historicalPayerBehaviorScore({
        hasPriorPaymentFromThisPayerToThisCustomer: false,
        hasPriorMemoPatternResolvedToThisCustomer: false,
        priorResolutionCount: 0,
      }),
    ).toBe(0);
  });
  test("one signal scores 0.6", () => {
    expect(
      historicalPayerBehaviorScore({
        hasPriorPaymentFromThisPayerToThisCustomer: true,
        hasPriorMemoPatternResolvedToThisCustomer: false,
        priorResolutionCount: 1,
      }),
    ).toBeCloseTo(0.6, 2);
  });
  test("both signals score 0.85", () => {
    expect(
      historicalPayerBehaviorScore({
        hasPriorPaymentFromThisPayerToThisCustomer: true,
        hasPriorMemoPatternResolvedToThisCustomer: true,
        priorResolutionCount: 1,
      }),
    ).toBeCloseTo(0.85, 2);
  });
  test("additional prior resolutions add bonus up to cap of 1.0", () => {
    expect(
      historicalPayerBehaviorScore({
        hasPriorPaymentFromThisPayerToThisCustomer: true,
        hasPriorMemoPatternResolvedToThisCustomer: true,
        priorResolutionCount: 20,
      }),
    ).toBe(1.0);
  });
});

describe("globalPatternScore", () => {
  test("not eligible returns 0 even if found", () => {
    expect(globalPatternScore({ found: true, weight: 0.25, eligibleForPooling: false })).toBe(0);
  });
  test("eligible but not found returns 0", () => {
    expect(globalPatternScore({ found: false, weight: 0.25, eligibleForPooling: true })).toBe(0);
  });
  test("eligible and found returns weight when under cap", () => {
    expect(globalPatternScore({ found: true, weight: 0.2, eligibleForPooling: true })).toBe(0.2);
  });
  test("weight above cap is clamped to 0.3", () => {
    expect(globalPatternScore({ found: true, weight: 0.5, eligibleForPooling: true })).toBe(0.3);
  });
});

describe("computeLayer2FeatureScore (aggregate)", () => {
  const payment = {
    payerNameRaw: "Acme Corp",
    amountReceived: 1000,
    paymentDateIso: "2026-07-05",
  };
  const candidates = [
    {
      invoiceId: "inv-1",
      invoiceBalance: 1000,
      invoiceDateIso: "2026-07-01",
      customerNameRaw: "Acme Corp",
    },
    {
      invoiceId: "inv-2",
      invoiceBalance: 5000,
      invoiceDateIso: "2026-01-01",
      customerNameRaw: "Zephyr Industries",
    },
  ];
  const noHistory = () => ({
    hasPriorPaymentFromThisPayerToThisCustomer: false,
    hasPriorMemoPatternResolvedToThisCustomer: false,
    priorResolutionCount: 0,
  });
  const noGlobalHit = () => ({ found: false, weight: 0, eligibleForPooling: true });

  test("strong candidate scores much higher than weak candidate", () => {
    const result = computeLayer2FeatureScore(candidates, payment, noHistory, noGlobalHit);
    expect(result[0].aggregateScore).toBeGreaterThan(result[1].aggregateScore);
    expect(result[0].aggregateScore).toBeGreaterThan(0.79);
  });
  test("global pattern hit boosts aggregate but stays capped contribution", () => {
    const withGlobal = () => ({ found: true, weight: 0.3, eligibleForPooling: true });
    const withoutGlobal = computeLayer2FeatureScore(candidates, payment, noHistory, noGlobalHit);
    const withGlobalResult = computeLayer2FeatureScore(candidates, payment, noHistory, withGlobal);
    expect(withGlobalResult[0].aggregateScore).toBeGreaterThanOrEqual(
      withoutGlobal[0].aggregateScore,
    );
    expect(withGlobalResult[0].globalPatternScore).toBeLessThanOrEqual(0.3);
  });
  test("aggregate never exceeds 1.0 even with max everything", () => {
    const maxHistory = () => ({
      hasPriorPaymentFromThisPayerToThisCustomer: true,
      hasPriorMemoPatternResolvedToThisCustomer: true,
      priorResolutionCount: 50,
    });
    const maxGlobal = () => ({ found: true, weight: 0.3, eligibleForPooling: true });
    const result = computeLayer2FeatureScore(candidates, payment, maxHistory, maxGlobal);
    expect(result[0].aggregateScore).toBeLessThanOrEqual(1.0);
  });
  test("returns one breakdown per candidate, in input order", () => {
    const result = computeLayer2FeatureScore(candidates, payment, noHistory, noGlobalHit);
    expect(result).toHaveLength(2);
    expect(result[0].invoiceId).toBe("inv-1");
    expect(result[1].invoiceId).toBe("inv-2");
  });
  test("empty candidates array returns empty result", () => {
    const result = computeLayer2FeatureScore([], payment, noHistory, noGlobalHit);
    expect(result).toEqual([]);
  });
});
