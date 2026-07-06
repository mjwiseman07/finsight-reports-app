/**
 * Layer 2 (D6.7 Part 2) probabilistic feature scorers.
 */
import { normalizePayerName } from "@/lib/ar-cash-app/normalization/payer-name";

function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0;
  const matchDistance = Math.max(Math.floor(Math.max(aLen, bLen) / 2) - 1, 0);
  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);
  let matches = 0;
  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bLen);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions = transpositions / 2;
  return (matches / aLen + matches / bLen + (matches - transpositions) / matches) / 3;
}

function jaroWinklerSimilarity(a: string, b: string): number {
  const jaro = jaroSimilarity(a, b);
  let prefixLen = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(maxPrefix, a.length, b.length); i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }
  const scalingFactor = 0.1;
  return jaro + prefixLen * scalingFactor * (1 - jaro);
}

export function fuzzyPayerNameScore(
  payerNameRaw: string | null,
  customerNameRaw: string | null,
): number {
  const a = normalizePayerName(payerNameRaw);
  const b = normalizePayerName(customerNameRaw);
  if (!a || !b) return 0;
  return Math.max(0, Math.min(1, jaroWinklerSimilarity(a, b)));
}

export function amountToleranceScore(paymentAmount: number, invoiceBalance: number): number {
  if (invoiceBalance <= 0) return 0;
  const deviation = Math.abs(paymentAmount - invoiceBalance) / invoiceBalance;
  if (deviation <= 0.05) return 1.0;
  if (deviation >= 0.30) return 0.0;
  return 1.0 - (deviation - 0.05) / (0.30 - 0.05);
}

export function dateProximityScore(paymentDateIso: string, invoiceDateIso: string): number {
  const paymentDate = new Date(paymentDateIso);
  const invoiceDate = new Date(invoiceDateIso);
  if (isNaN(paymentDate.getTime()) || isNaN(invoiceDate.getTime())) return 0;
  const diffDays =
    Math.abs(paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return 1.0;
  if (diffDays >= 120) return 0.0;
  return 1.0 - (diffDays - 30) / (120 - 30);
}

export interface HistoricalBehaviorInput {
  hasPriorPaymentFromThisPayerToThisCustomer: boolean;
  hasPriorMemoPatternResolvedToThisCustomer: boolean;
  priorResolutionCount: number;
}

export function historicalPayerBehaviorScore(input: HistoricalBehaviorInput): number {
  const {
    hasPriorPaymentFromThisPayerToThisCustomer,
    hasPriorMemoPatternResolvedToThisCustomer,
    priorResolutionCount,
  } = input;
  let base = 0;
  if (hasPriorPaymentFromThisPayerToThisCustomer && hasPriorMemoPatternResolvedToThisCustomer) {
    base = 0.85;
  } else if (hasPriorPaymentFromThisPayerToThisCustomer || hasPriorMemoPatternResolvedToThisCustomer) {
    base = 0.6;
  } else {
    return 0;
  }
  const bonus = Math.max(0, priorResolutionCount - 1) * 0.03;
  return Math.min(1, base + bonus);
}

export interface GlobalPatternHit {
  found: boolean;
  weight: number;
  eligibleForPooling: boolean;
}

export function globalPatternScore(hit: GlobalPatternHit): number {
  if (!hit.eligibleForPooling || !hit.found) return 0;
  return Math.min(hit.weight, 0.3);
}

export interface CandidateForScoring {
  invoiceId: string;
  invoiceBalance: number;
  invoiceDateIso: string;
  customerNameRaw: string | null;
}

export interface PaymentForScoring {
  payerNameRaw: string | null;
  amountReceived: number;
  paymentDateIso: string;
}

export interface FeatureBreakdown {
  invoiceId: string;
  fuzzyPayerNameScore: number;
  amountToleranceScore: number;
  dateProximityScore: number;
  historicalPayerBehaviorScore: number;
  globalPatternScore: number;
  globalPatternCapped: boolean;
  aggregateScore: number;
}

const CORE_WEIGHTS = {
  fuzzyPayerName: 0.35,
  amountTolerance: 0.30,
  dateProximity: 0.15,
  historicalBehavior: 0.20,
} as const;

export function computeLayer2FeatureScore(
  candidates: CandidateForScoring[],
  payment: PaymentForScoring,
  historicalLookup: (invoiceId: string) => HistoricalBehaviorInput,
  globalPatternLookup: (candidate: CandidateForScoring) => GlobalPatternHit,
): FeatureBreakdown[] {
  return candidates.map((candidate) => {
    const fuzzy = fuzzyPayerNameScore(payment.payerNameRaw, candidate.customerNameRaw);
    const amount = amountToleranceScore(payment.amountReceived, candidate.invoiceBalance);
    const date = dateProximityScore(payment.paymentDateIso, candidate.invoiceDateIso);
    const historical = historicalPayerBehaviorScore(historicalLookup(candidate.invoiceId));
    const globalHit = globalPatternLookup(candidate);
    const global = globalPatternScore(globalHit);
    const globalCapped = global >= 0.3 && globalHit.weight > 0.3;
    const coreScore =
      fuzzy * CORE_WEIGHTS.fuzzyPayerName +
      amount * CORE_WEIGHTS.amountTolerance +
      date * CORE_WEIGHTS.dateProximity +
      historical * CORE_WEIGHTS.historicalBehavior;
    const aggregate = Math.min(1, coreScore + global);
    return {
      invoiceId: candidate.invoiceId,
      fuzzyPayerNameScore: fuzzy,
      amountToleranceScore: amount,
      dateProximityScore: date,
      historicalPayerBehaviorScore: historical,
      globalPatternScore: global,
      globalPatternCapped: globalCapped,
      aggregateScore: aggregate,
    };
  });
}
