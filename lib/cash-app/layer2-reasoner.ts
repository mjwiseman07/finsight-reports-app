/**
 * Layer 2 tiered LLM reasoner (D6.7 Part 2, Q1=C / Q1a=B / Q1b=A).
 */
import { invokeClaude } from "@/lib/llm/anthropic-driver";
import { publishCashAppEvent } from "./publish-cash-app-event";
import type { FeatureBreakdown } from "./layer2-features";

export interface PaymentForReasoning {
  id: string;
  amountReceived: number;
  currency: string;
  payerNameRaw: string | null;
  paymentDateIso: string;
  memoRaw: string | null;
}

export interface CandidateForReasoning {
  invoiceId: string;
  docNumber: string;
  balance: number;
  currency: string;
  invoiceDateIso: string;
  customerId: string;
  customerName: string | null;
}

export interface FirmLlmConfig {
  layer2EscalationThreshold: number;
  layer2LlmPrimaryTier: "primary" | "toptier" | "haiku";
  layer2LlmEscalationTier: "primary" | "toptier" | "haiku";
}

export type LayerVerdict = "auto_match_candidate" | "route_to_review";

export interface LayerResult {
  verdict: LayerVerdict;
  preferredCandidateId: string | null;
  finalConfidence: number;
  primaryTierConfidence: number;
  primaryTierReasoning: string;
  escalated: boolean;
  toptierConfidence: number | null;
  toptierReasoning: string | null;
  malformedOutput: boolean;
}

interface LlmVerdict {
  verdict: "match" | "no_match" | "uncertain";
  confidence: number;
  reasoning: string;
  preferred_candidate_id: string | null;
}

export function buildSystemPrompt(): string {
  return [
    "You are a cash-application matching assistant for an accounting platform.",
    "Given a payment and a list of candidate open invoices with pre-computed feature",
    "scores, decide which candidate (if any) the payment should be matched to.",
    'You MUST respond with ONLY a single JSON object, no prose before or after, matching',
    'this exact shape:',
    '{"verdict": "match" | "no_match" | "uncertain", "confidence": <number 0..1>,',
    ' "reasoning": "<short explanation>", "preferred_candidate_id": "<invoice id or null>"}',
    "CURRENCY DISCIPLINE: All monetary amounts you see (payment.amount_received,",
    "candidate.balance, and any historical figures) are denominated in the currency",
    "named in the CURRENCY_SCOPE block below. You MUST NOT compare, sum, or infer",
    "arithmetic relationships between amounts in different currencies. If ANY candidate",
    "is denominated in a currency different from the payment_currency, verdict MUST be",
    '"no_match" and reasoning MUST cite the currency mismatch explicitly. Do not',
    "silently convert or approximate FX.",
    'Set verdict "match" only when you are confident a specific candidate is correct.',
    'Set "uncertain" when multiple candidates are plausible or evidence is weak.',
    'Set "no_match" when no candidate is plausible at all.',
    "confidence must reflect your true certainty — do not inflate it.",
  ].join(" ");
}

export function buildUserPrompt(
  payment: PaymentForReasoning,
  candidates: CandidateForReasoning[],
  featureBreakdowns: FeatureBreakdown[],
  homeCurrency: string,
  priorBelief?: { verdict: string; confidence: number; reasoning: string },
): string {
  const lines: string[] = [];
  lines.push("CURRENCY_SCOPE:");
  lines.push(
    JSON.stringify({
      payment_currency: payment.currency,
      home_currency: homeCurrency,
      note: "All monetary amounts in this prompt are denominated in payment_currency. Refuse cross-currency matches.",
    }),
  );
  lines.push("");
  lines.push("PAYMENT:");
  lines.push(
    JSON.stringify({
      amount_received: payment.amountReceived,
      currency: payment.currency,
      payer_name_raw: payment.payerNameRaw,
      payment_date: payment.paymentDateIso,
      memo_raw: payment.memoRaw,
    }),
  );
  lines.push("");
  lines.push("CANDIDATES (with pre-computed feature scores):");
  for (const c of candidates) {
    const fb = featureBreakdowns.find((f) => f.invoiceId === c.invoiceId);
    lines.push(
      JSON.stringify({
        invoice_id: c.invoiceId,
        doc_number: c.docNumber,
        balance: c.balance,
        currency: c.currency,
        invoice_date: c.invoiceDateIso,
        customer_name: c.customerName,
        feature_scores: fb
          ? {
              fuzzy_payer_name: fb.fuzzyPayerNameScore,
              amount_tolerance: fb.amountToleranceScore,
              date_proximity: fb.dateProximityScore,
              historical_behavior: fb.historicalPayerBehaviorScore,
              global_pattern: fb.globalPatternScore,
              aggregate: fb.aggregateScore,
            }
          : null,
      }),
    );
  }
  if (priorBelief) {
    lines.push("");
    lines.push("A prior, less-capable model reviewed this payment and produced this verdict.");
    lines.push(
      "It was NOT confident enough to auto-apply. Use it only as a starting hypothesis",
    );
    lines.push("— independently re-evaluate the evidence and disagree with it if warranted:");
    lines.push(JSON.stringify(priorBelief));
  }
  return lines.join("\n");
}

function tryParseLlmOutput(rawContent: string): LlmVerdict | null {
  let parsed: unknown;
  try {
    const stripped = rawContent
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "");
    parsed = JSON.parse(stripped);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const verdict = obj.verdict;
  const confidence = obj.confidence;
  const reasoning = obj.reasoning;
  const preferred = obj.preferred_candidate_id;
  if (
    (verdict !== "match" && verdict !== "no_match" && verdict !== "uncertain") ||
    typeof confidence !== "number" ||
    confidence < 0 ||
    confidence > 1 ||
    typeof reasoning !== "string" ||
    reasoning.length === 0 ||
    (preferred !== null && typeof preferred !== "string")
  ) {
    return null;
  }
  return {
    verdict,
    confidence,
    reasoning,
    preferred_candidate_id: preferred as string | null,
  };
}

export async function reasonAboutMatches(
  payment: PaymentForReasoning,
  topCandidates: CandidateForReasoning[],
  featureBreakdowns: FeatureBreakdown[],
  tenantId: { firmId: string; companyId: string },
  firmConfig: FirmLlmConfig,
  homeCurrency: string,
): Promise<LayerResult> {
  const systemPrompt = buildSystemPrompt();
  const primaryUserPrompt = buildUserPrompt(
    payment,
    topCandidates,
    featureBreakdowns,
    homeCurrency,
  );
  const scope = { firmId: tenantId.firmId, companyId: tenantId.companyId };

  const primaryResponse = await invokeClaude({
    tier: firmConfig.layer2LlmPrimaryTier,
    system: systemPrompt,
    messages: [{ role: "user", content: primaryUserPrompt }],
    maxTokens: 500,
  });

  const primaryParsed = tryParseLlmOutput(primaryResponse.text);
  if (!primaryParsed) {
    await publishCashAppEvent(
      "cash_app.layer2_scored",
      scope,
      "ar_cash_app_payment",
      payment.id,
      {
        feature_breakdowns: featureBreakdowns,
        llm_tier_used: firmConfig.layer2LlmPrimaryTier,
        malformed_output: true,
      },
      { actorType: "ai_agent" },
    );
    await publishCashAppEvent(
      "cash_app.layer2_dropped_to_review",
      scope,
      "ar_cash_app_payment",
      payment.id,
      { reason: "malformed_primary_llm_output" },
    );
    return {
      verdict: "route_to_review",
      preferredCandidateId: null,
      finalConfidence: 0,
      primaryTierConfidence: 0,
      primaryTierReasoning: "(malformed LLM output — dropped to review)",
      escalated: false,
      toptierConfidence: null,
      toptierReasoning: null,
      malformedOutput: true,
    };
  }

  const primaryConfidence =
    primaryParsed.verdict === "match"
      ? primaryParsed.confidence
      : Math.min(primaryParsed.confidence, 0.5);

  await publishCashAppEvent(
    "cash_app.layer2_scored",
    scope,
    "ar_cash_app_payment",
    payment.id,
    {
      feature_breakdowns: featureBreakdowns,
      llm_tier_used: firmConfig.layer2LlmPrimaryTier,
      llm_verdict: primaryParsed.verdict,
      llm_confidence: primaryConfidence,
      llm_reasoning_excerpt: primaryParsed.reasoning.slice(0, 500),
      preferred_candidate_id: primaryParsed.preferred_candidate_id,
    },
    { actorType: "ai_agent" },
  );

  if (primaryConfidence < firmConfig.layer2EscalationThreshold) {
    await publishCashAppEvent(
      "cash_app.layer2_escalated_to_toptier",
      scope,
      "ar_cash_app_payment",
      payment.id,
      {
        primary_confidence: primaryConfidence,
        threshold: firmConfig.layer2EscalationThreshold,
      },
    );

    const escalationUserPrompt = buildUserPrompt(
      payment,
      topCandidates,
      featureBreakdowns,
      homeCurrency,
      {
        verdict: primaryParsed.verdict,
        confidence: primaryConfidence,
        reasoning: primaryParsed.reasoning,
      },
    );

    const toptierResponse = await invokeClaude({
      tier: firmConfig.layer2LlmEscalationTier,
      system: systemPrompt,
      messages: [{ role: "user", content: escalationUserPrompt }],
      maxTokens: 500,
    });

    const toptierParsed = tryParseLlmOutput(toptierResponse.text);
    if (!toptierParsed) {
      await publishCashAppEvent(
        "cash_app.layer2_dropped_to_review",
        scope,
        "ar_cash_app_payment",
        payment.id,
        { reason: "malformed_toptier_llm_output" },
      );
      return {
        verdict: "route_to_review",
        preferredCandidateId: primaryParsed.preferred_candidate_id,
        finalConfidence: primaryConfidence,
        primaryTierConfidence: primaryConfidence,
        primaryTierReasoning: primaryParsed.reasoning,
        escalated: true,
        toptierConfidence: null,
        toptierReasoning: "(malformed LLM output — dropped to review)",
        malformedOutput: true,
      };
    }

    const toptierConfidence =
      toptierParsed.verdict === "match"
        ? toptierParsed.confidence
        : Math.min(toptierParsed.confidence, 0.5);

    await publishCashAppEvent(
      "cash_app.layer2_scored",
      scope,
      "ar_cash_app_payment",
      payment.id,
      {
        feature_breakdowns: featureBreakdowns,
        llm_tier_used: firmConfig.layer2LlmEscalationTier,
        llm_verdict: toptierParsed.verdict,
        llm_confidence: toptierConfidence,
        llm_reasoning_excerpt: toptierParsed.reasoning.slice(0, 500),
        preferred_candidate_id: toptierParsed.preferred_candidate_id,
        escalated_from_primary_confidence: primaryConfidence,
      },
      { actorType: "ai_agent" },
    );

    if (toptierConfidence < firmConfig.layer2EscalationThreshold) {
      await publishCashAppEvent(
        "cash_app.layer2_dropped_to_review",
        scope,
        "ar_cash_app_payment",
        payment.id,
        {
          primary_confidence: primaryConfidence,
          toptier_confidence: toptierConfidence,
          threshold: firmConfig.layer2EscalationThreshold,
        },
      );
      return {
        verdict: "route_to_review",
        preferredCandidateId:
          toptierParsed.preferred_candidate_id ?? primaryParsed.preferred_candidate_id,
        finalConfidence: toptierConfidence,
        primaryTierConfidence: primaryConfidence,
        primaryTierReasoning: primaryParsed.reasoning,
        escalated: true,
        toptierConfidence,
        toptierReasoning: toptierParsed.reasoning,
        malformedOutput: false,
      };
    }

    return {
      verdict: "auto_match_candidate",
      preferredCandidateId: toptierParsed.preferred_candidate_id,
      finalConfidence: toptierConfidence,
      primaryTierConfidence: primaryConfidence,
      primaryTierReasoning: primaryParsed.reasoning,
      escalated: true,
      toptierConfidence,
      toptierReasoning: toptierParsed.reasoning,
      malformedOutput: false,
    };
  }

  return {
    verdict: "auto_match_candidate",
    preferredCandidateId: primaryParsed.preferred_candidate_id,
    finalConfidence: primaryConfidence,
    primaryTierConfidence: primaryConfidence,
    primaryTierReasoning: primaryParsed.reasoning,
    escalated: false,
    toptierConfidence: null,
    toptierReasoning: null,
    malformedOutput: false,
  };
}
