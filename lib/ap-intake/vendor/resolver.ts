import type { IntakeHandlerContext } from "@/lib/intake/types";
import { normalizeVendorName } from "./normalize";
import { metaphone, similarity } from "./fuzzy";

export interface VendorResolutionOutcome {
  method: "exact" | "fuzzy_candidate" | "no_match";
  resolved_vendor_id: string | null;
  candidate_ids: string[];
  confidence: number | null;
  signals: Array<{ code: string; severity: "INFO" | "HIGH"; evidence: Record<string, unknown> }>;
}

const FUZZY_THRESHOLD = 0.85;
const STALE_HOURS = 24;

function extractVendorCandidate(rawText: string, senderDomain: string | null): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const invoiceLine = /^(invoice|bill|receipt|payment)\b/i;
  const numberOnly = /^[\d\W]+$/;
  for (const line of lines.slice(0, 6)) {
    if (invoiceLine.test(line)) continue;
    if (numberOnly.test(line)) continue;
    if (line.length < 3) continue;
    return line;
  }
  if (senderDomain) {
    const root = senderDomain.split(".").slice(-2, -1)[0] ?? senderDomain;
    return root;
  }
  return "";
}

export async function resolveVendor(
  ctx: IntakeHandlerContext,
  extractedText: string,
): Promise<VendorResolutionOutcome> {
  const rawCandidate = extractVendorCandidate(extractedText, ctx.message.sender_domain);
  const normalized = normalizeVendorName(rawCandidate);
  const signals: VendorResolutionOutcome["signals"] = [];

  const { data: rows } = await ctx.supabase
    .from("vendor_master_mirror")
    .select("id, display_name, normalized_name, metaphone_code, last_synced_at")
    .eq("firm_client_id", ctx.message.firm_client_id)
    .eq("active", true);

  const mirror = (rows ?? []) as Array<{
    id: string;
    display_name: string;
    normalized_name: string;
    metaphone_code: string;
    last_synced_at: string;
  }>;

  if (mirror.length > 0) {
    const newest = mirror.reduce((a, b) =>
      a.last_synced_at > b.last_synced_at ? a : b,
    );
    const hoursSince =
      (Date.now() - new Date(newest.last_synced_at).getTime()) / 3_600_000;
    if (hoursSince > STALE_HOURS) {
      signals.push({
        code: "vendor_mirror_stale",
        severity: "INFO",
        evidence: { hours_since_sync: Number(hoursSince.toFixed(2)) },
      });
    }
  }

  if (!normalized || mirror.length === 0) {
    signals.push({
      code: "no_match_route_to_quarantine",
      severity: "HIGH",
      evidence: { candidate_name: rawCandidate, normalized },
    });
    return {
      method: "no_match",
      resolved_vendor_id: null,
      candidate_ids: [],
      confidence: null,
      signals,
    };
  }

  const exact = mirror.find((m) => m.normalized_name === normalized);
  if (exact) {
    return {
      method: "exact",
      resolved_vendor_id: exact.id,
      candidate_ids: [],
      confidence: null,
      signals,
    };
  }

  const scored = mirror
    .map((m) => ({ id: m.id, score: similarity(normalized, m.normalized_name) }))
    .filter((s) => s.score >= FUZZY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length > 0) {
    return {
      method: "fuzzy_candidate",
      resolved_vendor_id: null,
      candidate_ids: scored.map((s) => s.id),
      confidence: scored[0].score,
      signals,
    };
  }

  const code = metaphone(normalized);
  if (code) {
    const phon = mirror
      .filter((m) => m.metaphone_code === code)
      .map((m) => ({ id: m.id, score: similarity(normalized, m.normalized_name) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    if (phon.length > 0) {
      return {
        method: "fuzzy_candidate",
        resolved_vendor_id: null,
        candidate_ids: phon.map((p) => p.id),
        confidence: phon[0].score,
        signals,
      };
    }
  }

  signals.push({
    code: "no_match_route_to_quarantine",
    severity: "HIGH",
    evidence: { candidate_name: rawCandidate, normalized },
  });
  return {
    method: "no_match",
    resolved_vendor_id: null,
    candidate_ids: [],
    confidence: null,
    signals,
  };
}
