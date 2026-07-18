import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
  type PaymentForReasoning,
  type CandidateForReasoning,
} from "./layer2-reasoner";
import type { FeatureBreakdown } from "./layer2-features";

function makeFeatureBreakdown(invoiceId: string): FeatureBreakdown {
  return {
    invoiceId,
    fuzzyPayerNameScore: 0.8,
    amountToleranceScore: 1.0,
    dateProximityScore: 0.9,
    historicalPayerBehaviorScore: 0.5,
    globalPatternScore: 0.0,
    globalPatternCapped: false,
    aggregateScore: 0.85,
  };
}

describe("MC-4d Gap AI-2 — LLM prompt currency context", () => {
  it("system prompt contains currency-discipline rule", () => {
    const sys = buildSystemPrompt();
    expect(sys).toContain("CURRENCY DISCIPLINE");
    expect(sys).toContain("CURRENCY_SCOPE");
    expect(sys).toContain("MUST NOT compare");
    expect(sys).toContain("different currencies");
    expect(sys).toContain('"no_match"');
    expect(sys).toContain("cite the currency mismatch");
    expect(sys).toContain("Do not silently convert or approximate FX");
  });

  it("user prompt emits CURRENCY_SCOPE block first with payment and home currency (USD/USD)", () => {
    const payment: PaymentForReasoning = {
      id: "p1",
      amountReceived: 1000,
      currency: "USD",
      payerNameRaw: "Acme Corp",
      paymentDateIso: "2026-07-01",
      memoRaw: "INV-100",
    };
    const candidates: CandidateForReasoning[] = [
      {
        invoiceId: "inv-100",
        docNumber: "100",
        balance: 1000,
        currency: "USD",
        invoiceDateIso: "2026-06-01",
        customerId: "cust-1",
        customerName: "Acme Corp",
      },
    ];
    const fbs = [makeFeatureBreakdown("inv-100")];
    const prompt = buildUserPrompt(payment, candidates, fbs, "USD");
    const firstLine = prompt.split("\n")[0];
    expect(firstLine).toBe("CURRENCY_SCOPE:");
    const scopeLine = prompt.split("\n")[1];
    const scope = JSON.parse(scopeLine);
    expect(scope.payment_currency).toBe("USD");
    expect(scope.home_currency).toBe("USD");
    expect(scope.note).toContain("Refuse cross-currency matches");
    expect(prompt).toContain("PAYMENT:");
    expect(prompt).toContain("CANDIDATES");
    expect(prompt).toContain('"currency":"USD"');
  });

  it("EUR payment with USD home currency emits both correctly", () => {
    const payment: PaymentForReasoning = {
      id: "p2",
      amountReceived: 500,
      currency: "EUR",
      payerNameRaw: "Euro Client GmbH",
      paymentDateIso: "2026-07-01",
      memoRaw: null,
    };
    const candidates: CandidateForReasoning[] = [
      {
        invoiceId: "inv-200",
        docNumber: "200",
        balance: 500,
        currency: "EUR",
        invoiceDateIso: "2026-06-01",
        customerId: "cust-2",
        customerName: "Euro Client GmbH",
      },
    ];
    const fbs = [makeFeatureBreakdown("inv-200")];
    const prompt = buildUserPrompt(payment, candidates, fbs, "USD");
    const scope = JSON.parse(prompt.split("\n")[1]);
    expect(scope.payment_currency).toBe("EUR");
    expect(scope.home_currency).toBe("USD");
    expect(prompt).toContain('"currency":"EUR"');
  });

  it("mixed-currency candidate emits its currency explicitly so the LLM can detect the anomaly", () => {
    const payment: PaymentForReasoning = {
      id: "p3",
      amountReceived: 750,
      currency: "USD",
      payerNameRaw: "Mixed Corp",
      paymentDateIso: "2026-07-01",
      memoRaw: null,
    };
    // Note: MC-4a filters this out before Layer-2 runs, but if it ever leaks
    // through, the LLM will now see the explicit currency mismatch.
    const candidates: CandidateForReasoning[] = [
      {
        invoiceId: "inv-300",
        docNumber: "300",
        balance: 750,
        currency: "GBP",
        invoiceDateIso: "2026-06-01",
        customerId: "cust-3",
        customerName: "Mixed Corp",
      },
    ];
    const fbs = [makeFeatureBreakdown("inv-300")];
    const prompt = buildUserPrompt(payment, candidates, fbs, "USD");
    const scope = JSON.parse(prompt.split("\n")[1]);
    expect(scope.payment_currency).toBe("USD");
    expect(prompt).toContain('"currency":"GBP"');
    // System prompt combined with prompt-side currency data means the LLM has all
    // it needs to return no_match with a currency-mismatch citation.
  });

  it("prior belief section still renders correctly with currency scope", () => {
    const payment: PaymentForReasoning = {
      id: "p4",
      amountReceived: 200,
      currency: "USD",
      payerNameRaw: "X",
      paymentDateIso: "2026-07-01",
      memoRaw: null,
    };
    const candidates: CandidateForReasoning[] = [
      {
        invoiceId: "inv-400",
        docNumber: "400",
        balance: 200,
        currency: "USD",
        invoiceDateIso: "2026-06-01",
        customerId: "cust-4",
        customerName: "X",
      },
    ];
    const fbs = [makeFeatureBreakdown("inv-400")];
    const prompt = buildUserPrompt(payment, candidates, fbs, "USD", {
      verdict: "uncertain",
      confidence: 0.4,
      reasoning: "amount matches but payer weak",
    });
    expect(prompt).toContain("A prior, less-capable model");
    expect(prompt).toContain("uncertain");
    expect(prompt.indexOf("CURRENCY_SCOPE:")).toBeLessThan(prompt.indexOf("PAYMENT:"));
    expect(prompt.indexOf("PAYMENT:")).toBeLessThan(prompt.indexOf("CANDIDATES"));
    expect(prompt.indexOf("CANDIDATES")).toBeLessThan(prompt.indexOf("A prior, less-capable"));
  });
});
