// PBC-TIEOUT-1: deterministic keyword + regex classifier for tie_out_kind.
// LLM fallback via existing Bedrock plumbing when deterministic returns 'unclassified'.
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { invokeBedrock } from "./bedrock-client";
import { checkEngagementCap, logUsage } from "./llm-usage";
import type { ParsedPbcRequest } from "./pbc-parser";

export const TIE_OUT_KINDS = [
  "ar_aging",
  "ap_aging",
  "inventory",
  "grni",
  "bank_recon",
  "fixed_asset_rollforward",
  "cash_recon",
  "debt_schedule",
  "equity_rollforward",
  "revenue_cutoff",
  "expense_cutoff",
  "bs_account_recon",
  "bs_recon_summary",
  "unclassified",
] as const;

export type TieOutKind = (typeof TIE_OUT_KINDS)[number];

type Rule = {
  kind: Exclude<TieOutKind, "unclassified">;
  weight: number;
  patterns: RegExp[];
};

// Rules are ordered by specificity. First strong match (score ≥ 0.9 semantic
// weight) short-circuits; else all rules are scored and the highest wins if
// the margin is material.
const RULES: Rule[] = [
  {
    kind: "ar_aging",
    weight: 1.0,
    patterns: [
      /\bar\s+aging\b/i,
      /accounts?\s+receivable\s+aging/i,
      /\baged?\s+receivables?\b/i,
      /\bar\s+detail\b/i,
      /outstanding\s+invoices?/i,
    ],
  },
  {
    kind: "ap_aging",
    weight: 1.0,
    patterns: [
      /\bap\s+aging\b/i,
      /accounts?\s+payable\s+aging/i,
      /\baged?\s+payables?\b/i,
      /\bap\s+detail\b/i,
      /open\s+bills?/i,
      /vendor\s+aging/i,
    ],
  },
  {
    kind: "inventory",
    weight: 1.0,
    patterns: [
      /\binventory\s+listing\b/i,
      /perpetual\s+inventory/i,
      /inventory\s+valuation/i,
      /stock\s+on\s+hand/i,
      /\bitem\s+quantity\b/i,
      /\bcogs\s+reconciliation\b/i,
    ],
  },
  {
    kind: "grni",
    weight: 1.0,
    patterns: [
      /\bgrni\b/i,
      /goods\s+received\s+not\s+invoiced/i,
      /received\s+not\s+billed/i,
      /\brnb\b/i,
    ],
  },
  {
    kind: "bank_recon",
    weight: 1.0,
    patterns: [
      /bank\s+reconciliation/i,
      /bank\s+recon\b/i,
      /outstanding\s+checks?/i,
      /deposits?\s+in\s+transit/i,
    ],
  },
  {
    kind: "cash_recon",
    weight: 0.9,
    patterns: [
      /cash\s+reconciliation/i,
      /petty\s+cash/i,
      /cash\s+count/i,
    ],
  },
  {
    kind: "fixed_asset_rollforward",
    weight: 1.0,
    patterns: [
      /fixed\s+assets?/i,
      /property,?\s+plant,?\s+and\s+equipment/i,
      /\bpp&?e\s+rollforward/i,
      /depreciation\s+schedule/i,
      /capital\s+expenditure/i,
      /\bcapex\s+rollforward\b/i,
      /fixed\s+asset\s+rollforward/i,
    ],
  },
  {
    kind: "debt_schedule",
    weight: 1.0,
    patterns: [
      /debt\s+schedule/i,
      /loan\s+amortization/i,
      /note[s]?\s+payable\s+schedule/i,
      /line\s+of\s+credit\s+activity/i,
    ],
  },
  {
    kind: "equity_rollforward",
    weight: 1.0,
    patterns: [
      /equity\s+rollforward/i,
      /statement\s+of\s+changes\s+in\s+equity/i,
      /retained\s+earnings\s+rollforward/i,
      /stock\s+issuance/i,
      /dividends?\s+declared/i,
    ],
  },
  {
    kind: "revenue_cutoff",
    weight: 0.95,
    patterns: [
      /revenue\s+cut[- ]?off/i,
      /sales\s+cut[- ]?off/i,
      /invoices?\s+dated\s+after/i,
      /shipped\s+not\s+billed/i,
    ],
  },
  {
    kind: "expense_cutoff",
    weight: 0.95,
    patterns: [
      /expense\s+cut[- ]?off/i,
      /accrued\s+expenses?/i,
      /prepaid\s+expenses?\s+detail/i,
      /bills?\s+dated\s+after/i,
    ],
  },
];

export type DeterministicClassification = {
  kind: TieOutKind;
  confidence: number; // 0..1
  matched_patterns: string[]; // for debug
};

export function classifyTieOutKindDeterministic(
  request: Pick<ParsedPbcRequest, "request_number" | "request_description"> & {
    source_account_hint?: string | null;
  },
): DeterministicClassification {
  const haystack = [
    request.request_number || "",
    request.request_description || "",
    request.source_account_hint || "",
  ]
    .join(" ")
    .trim();
  if (!haystack) return { kind: "unclassified", confidence: 0, matched_patterns: [] };
  let bestKind: TieOutKind = "unclassified";
  let bestScore = 0;
  let bestMatches: string[] = [];
  let secondScore = 0;
  for (const rule of RULES) {
    const matches = rule.patterns.filter((p) => p.test(haystack)).map((p) => p.source);
    if (!matches.length) continue;
    const score = rule.weight * Math.min(1, matches.length * 0.5 + 0.5); // 1 match → 0.75×w, 2 → 1.0×w
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestKind = rule.kind;
      bestMatches = matches;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }
  // Require material margin to avoid claiming when two rules tie.
  if (bestScore >= 0.9 && bestScore - secondScore >= 0.15) {
    return { kind: bestKind, confidence: Math.min(1, bestScore), matched_patterns: bestMatches };
  }
  if (bestScore >= 0.6 && bestScore - secondScore >= 0.25) {
    return { kind: bestKind, confidence: bestScore, matched_patterns: bestMatches };
  }
  return { kind: "unclassified", confidence: bestScore, matched_patterns: [] };
}

// ─────────────────────────────────────────────────────────────
// Bedrock fallback — used only when deterministic returns 'unclassified'
// AND the caller opts in. Batched to amortize prompt overhead.
// ─────────────────────────────────────────────────────────────
const KIND_DOCS: Record<Exclude<TieOutKind, "unclassified">, string> = {
  ar_aging: "Aged receivables detail or open invoices — auditor ties AR subledger to GL.",
  ap_aging: "Aged payables detail or open bills — auditor ties AP subledger to GL.",
  inventory: "Perpetual inventory listing, valuation, or COGS reconciliation — auditor ties inventory subledger to GL.",
  grni: "Goods received not invoiced / received-not-billed — auditor tests cutoff and completeness.",
  bank_recon: "Bank reconciliation with outstanding checks and deposits in transit.",
  cash_recon: "Cash reconciliation, petty cash count, or cash-on-hand verification.",
  fixed_asset_rollforward:
    "PP&E rollforward, depreciation schedule, or capex activity.",
  debt_schedule: "Loan or note amortization schedule, line-of-credit activity, or debt covenants.",
  equity_rollforward: "Equity rollforward, stock issuance, dividends, or retained earnings movement.",
  revenue_cutoff: "Revenue cutoff testing — invoices/shipments straddling period end.",
  expense_cutoff: "Expense cutoff testing — accruals, prepaids, or bills dated after period end.",
  bs_account_recon:
    "Single balance-sheet account recon — prepared schedule or GL activity tied to trial balance.",
  bs_recon_summary:
    "Balance-sheet equation rollup across all accounts for a period end.",
};

export async function classifyTieOutKindLLMBatch(
  requests: Array<
    Pick<ParsedPbcRequest, "request_number" | "request_description"> & {
      source_account_hint?: string | null;
    }
  >,
  engagementId: string,
  calledByUserId: string,
): Promise<Array<{ kind: TieOutKind; confidence: number }>> {
  if (!requests.length) return [];
  const cap = await checkEngagementCap(engagementId, "sonnet");
  if (!cap.allowed) {
    return requests.map(() => ({ kind: "unclassified" as TieOutKind, confidence: 0 }));
  }
  const taxonomy = (Object.keys(KIND_DOCS) as Array<keyof typeof KIND_DOCS>)
    .map((k) => `- ${k}: ${KIND_DOCS[k]}`)
    .join("\n");
  const result = await invokeBedrock({
    model: cap.modelToUse,
    systemPrompt:
      "You classify audit PBC requests into ONE tie-out family. " +
      'Return JSON: { "classifications": [{ "index": <0-based>, "kind": "<one_key>", "confidence": <0..1> }] }. ' +
      'Every request must get exactly one kind. If none apply, use "unclassified" with confidence 0. ' +
      "Valid keys only:\n" +
      taxonomy,
    userPrompt:
      `Classify these ${requests.length} PBC requests:\n\n` +
      requests
        .map(
          (r, i) =>
            `[${i}] ${r.request_number}: ${r.request_description}` +
            (r.source_account_hint ? ` (account hint: ${r.source_account_hint})` : ""),
        )
        .join("\n\n"),
    maxTokens: 2048,
    temperature: 0,
  });
  await logUsage(
    { engagementId, operation: "tie_out_kind_classify", calledByUserId },
    result,
    cap.modelToUse,
    true,
  );
  // Sonnet may fence JSON — same defensive parse as assertion-classifier.
  let parsed: {
    classifications: Array<{ index: number; kind: string; confidence: number }>;
  } | null = null;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = null;
      }
    }
  }
  if (!parsed) {
    console.error("[tie-out-kind-classifier] JSON parse failed", {
      engagementId,
      count: requests.length,
    });
    return requests.map(() => ({ kind: "unclassified" as TieOutKind, confidence: 0 }));
  }
  const out: Array<{ kind: TieOutKind; confidence: number }> = requests.map(() => ({
    kind: "unclassified" as TieOutKind,
    confidence: 0,
  }));
  const validKinds = new Set<string>(TIE_OUT_KINDS);
  for (const c of parsed.classifications || []) {
    if (typeof c.index !== "number" || c.index < 0 || c.index >= out.length) continue;
    const k = validKinds.has(c.kind) ? (c.kind as TieOutKind) : "unclassified";
    const conf = Math.min(1, Math.max(0, Number(c.confidence) || 0));
    out[c.index] = { kind: k, confidence: conf };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Persistence helper — used by the API route to bulk-classify + persist.
// ─────────────────────────────────────────────────────────────
export async function classifyAndPersistTieOutKinds(params: {
  engagementId: string;
  calledByUserId: string;
  useLLMFallback: boolean;
}): Promise<{ classified: number; llm_used: number; unclassified_after_llm: number }> {
  type PbcRow = {
    id: string;
    request_number: string;
    request_description: string;
    source_account_hint: string | null;
    tie_out_kind: string | null;
  };
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("audit_ready_pbc_requests")
    .select("id, request_number, request_description, source_account_hint, tie_out_kind")
    .eq("engagement_id", params.engagementId);
  if (error) throw error;
  const requests = ((rows || []) as PbcRow[]).filter((r) => r.tie_out_kind === null);
  if (!requests.length) return { classified: 0, llm_used: 0, unclassified_after_llm: 0 };
  let deterministicWins = 0;
  const needLLM: PbcRow[] = [];
  const nowIso = new Date().toISOString();
  // Pass 1: deterministic
  for (const r of requests) {
    const c = classifyTieOutKindDeterministic({
      request_number: r.request_number,
      request_description: r.request_description,
      source_account_hint: r.source_account_hint,
    });
    if (c.kind !== "unclassified") {
      await supabase
        .from("audit_ready_pbc_requests")
        .update({
          tie_out_kind: c.kind,
          tie_out_kind_confidence: c.confidence,
          tie_out_kind_classified_at: nowIso,
          tie_out_kind_classifier: "deterministic",
          updated_at: nowIso,
        })
        .eq("id", r.id);
      deterministicWins++;
    } else {
      needLLM.push(r);
    }
  }
  // Pass 2: LLM fallback (optional)
  let llmUsed = 0;
  let unclassifiedAfterLLM = needLLM.length;
  if (params.useLLMFallback && needLLM.length) {
    const results = await classifyTieOutKindLLMBatch(
      needLLM.map((r) => ({
        request_number: r.request_number,
        request_description: r.request_description,
        source_account_hint: r.source_account_hint,
      })),
      params.engagementId,
      params.calledByUserId,
    );
    unclassifiedAfterLLM = 0;
    for (let i = 0; i < needLLM.length; i++) {
      const r = needLLM[i];
      const c = results[i];
      await supabase
        .from("audit_ready_pbc_requests")
        .update({
          tie_out_kind: c.kind,
          tie_out_kind_confidence: c.confidence,
          tie_out_kind_classified_at: nowIso,
          tie_out_kind_classifier: "bedrock_sonnet",
          updated_at: nowIso,
        })
        .eq("id", r.id);
      llmUsed++;
      if (c.kind === "unclassified") unclassifiedAfterLLM++;
    }
  }
  return {
    classified: deterministicWins + llmUsed,
    llm_used: llmUsed,
    unclassified_after_llm: unclassifiedAfterLLM,
  };
}
