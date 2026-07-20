import type { ResolvedAccountCandidate, StrictAccountResolution } from "./types";
import { getCoaForFirmClient } from "./coa-cache";

const norm = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9: ]/g, "")
    .trim();

const tokens = (s: string) => new Set(norm(s).split(" ").filter(Boolean));

function jaccard(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

function markMatch(
  c: ResolvedAccountCandidate,
  kind: ResolvedAccountCandidate["match_kind"],
  score: number,
): ResolvedAccountCandidate {
  return { ...c, match_kind: kind, match_score: score };
}

export type StrictResolveResult = StrictAccountResolution & {
  resolver_from_cache: boolean;
  resolver_ttl_seconds: number;
};

export async function strictResolveAccount(
  firmClientId: string,
  phrase: string,
): Promise<StrictResolveResult> {
  const { accounts, fromCache, ttlSeconds } = await getCoaForFirmClient(firmClientId);
  const searched = phrase.trim();
  if (!searched) {
    return {
      status: "not_found",
      searched_phrase: "",
      resolver_from_cache: fromCache,
      resolver_ttl_seconds: ttlSeconds,
    };
  }

  const nP = norm(searched);

  const fqExact = accounts.find((a) => norm(a.fully_qualified_name) === nP && a.active);
  if (fqExact) {
    return {
      status: "resolved",
      account: markMatch(fqExact, "fully_qualified_exact", 1),
      resolver_from_cache: fromCache,
      resolver_ttl_seconds: ttlSeconds,
    };
  }

  const exact = accounts.filter((a) => norm(a.name) === nP && a.active);
  if (exact.length === 1) {
    return {
      status: "resolved",
      account: markMatch(exact[0]!, "case_insensitive_exact", 1),
      resolver_from_cache: fromCache,
      resolver_ttl_seconds: ttlSeconds,
    };
  }
  if (exact.length > 1) {
    return {
      status: "ambiguous",
      candidates: exact.map((a) => markMatch(a, "case_insensitive_exact", 1)),
      resolver_from_cache: fromCache,
      resolver_ttl_seconds: ttlSeconds,
    };
  }

  const scored = accounts
    .filter((a) => a.active)
    .map((a) => ({
      a,
      s: Math.max(jaccard(a.name, searched), jaccard(a.fully_qualified_name, searched)),
    }))
    .filter((x) => x.s >= 0.5)
    .sort((a, b) => b.s - a.s);

  if (
    scored.length === 1 ||
    (scored.length > 1 && scored[0]!.s - scored[1]!.s >= 0.25)
  ) {
    return {
      status: "resolved",
      account: markMatch(scored[0]!.a, "fuzzy", scored[0]!.s),
      resolver_from_cache: fromCache,
      resolver_ttl_seconds: ttlSeconds,
    };
  }

  if (scored.length > 1) {
    return {
      status: "ambiguous",
      candidates: scored.slice(0, 5).map((x) => markMatch(x.a, "fuzzy", x.s)),
      resolver_from_cache: fromCache,
      resolver_ttl_seconds: ttlSeconds,
    };
  }

  return {
    status: "not_found",
    searched_phrase: searched,
    resolver_from_cache: fromCache,
    resolver_ttl_seconds: ttlSeconds,
  };
}
