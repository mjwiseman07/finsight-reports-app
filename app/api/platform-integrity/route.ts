/**
 * MAJOR #2.3 Block B.1 — GET /api/platform-integrity
 *
 * Returns Platform Integrity findings for the current session's firm_id.
 * Requires an authenticated session; RLS on lifecycle_issues (via the
 * SECURITY INVOKER view) does the actual data scoping.
 *
 * Note: no shared `@/lib/supabase/server` helper exists in this repo.
 * Cookie SSR client mirrors `/api/entitlements` and `lib/audit-ready/server-auth.ts`.
 */

import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resolveCitation, METHODOLOGY } from "@/lib/platform-integrity/citations";
import type {
  PlatformIntegrityFinding,
  PlatformIntegrityResponse,
  AssertionConfidence,
  FinancialReportingRelevance,
  MappingSource,
  ChainStatus,
} from "@/lib/platform-integrity/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getSupabaseSsr() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // read-only context
          }
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // read-only context
          }
        },
      },
    },
  );
}

interface RawViewRow {
  id: string;
  detected_at: string;
  fingerprint: string;
  issue_kind: string;
  level: string;
  firm_id: string | null;
  company_id: string | null;
  drift_table: string | null;
  drift_column: string | null;
  drift_reason: string | null;
  assertion_impact: unknown;
  assertion_confidence: string;
  financial_reporting_relevance: string;
  mapping_source: string;
  detector_version: string | null;
}

function asAssertionImpact(v: unknown): readonly string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

export async function GET() {
  const supabase = await getSupabaseSsr();

  // Session guard
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Read the view (RLS via SECURITY INVOKER)
  const { data: viewRows, error: viewError } = await supabase
    .from("v_platform_integrity_current")
    .select(
      "id, detected_at, fingerprint, issue_kind, level, firm_id, company_id, drift_table, drift_column, drift_reason, assertion_impact, assertion_confidence, financial_reporting_relevance, mapping_source, detector_version",
    )
    .order("detected_at", { ascending: false })
    .limit(500);

  if (viewError) {
    console.error("[platform-integrity] view read failed", viewError);
    return NextResponse.json(
      { error: "internal_error", detail: viewError.message },
      { status: 500 },
    );
  }

  const rows = (viewRows ?? []) as unknown as RawViewRow[];

  // Determine firm_id for chain status (from any row, or from user metadata)
  const firmIdFromRows = rows.find((r) => r.firm_id)?.firm_id ?? null;
  let chain: ChainStatus = {
    chain_intact: true,
    chain_gap_count: 0,
    latest_seq: null,
    latest_event_at: null,
  };

  if (firmIdFromRows) {
    const { data: chainData, error: chainError } = await supabase.rpc(
      "platform_integrity_chain_status",
      { p_firm_id: firmIdFromRows },
    );
    if (chainError) {
      console.warn("[platform-integrity] chain_status rpc failed", chainError);
      // Continue with safe default; do NOT fail the request
    } else if (Array.isArray(chainData) && chainData.length > 0) {
      const c = chainData[0] as {
        chain_intact: boolean;
        chain_gap_count: number;
        latest_seq: number | string | null;
        latest_event_at: string | null;
      };
      chain = {
        chain_intact: Boolean(c.chain_intact),
        chain_gap_count: Number(c.chain_gap_count ?? 0),
        latest_seq: c.latest_seq === null ? null : Number(c.latest_seq),
        latest_event_at: c.latest_event_at,
      };
    }
  }

  const findings: PlatformIntegrityFinding[] = rows.map((r) => ({
    id: r.id,
    detected_at: r.detected_at,
    fingerprint: r.fingerprint,
    issue_kind: r.issue_kind,
    level: r.level,
    firm_id: r.firm_id,
    company_id: r.company_id,
    drift_table: r.drift_table,
    drift_column: r.drift_column,
    drift_reason: r.drift_reason,
    assertion_impact: asAssertionImpact(
      r.assertion_impact,
    ) as PlatformIntegrityFinding["assertion_impact"],
    assertion_confidence: r.assertion_confidence as AssertionConfidence,
    financial_reporting_relevance:
      r.financial_reporting_relevance as FinancialReportingRelevance,
    mapping_source: r.mapping_source as MappingSource,
    detector_version: r.detector_version,
    citation: resolveCitation(r.mapping_source),
  }));

  const body: PlatformIntegrityResponse = {
    findings,
    chain,
    methodology: METHODOLOGY,
    detector_next_run_hint: "Detector runs hourly at :10 past the hour (UTC).",
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "cache-control": "private, max-age=15",
    },
  });
}
