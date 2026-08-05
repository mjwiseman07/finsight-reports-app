/**
 * MAJOR #2 — Hourly schema drift detector cron.
 *
 * Fetches the last hour of postgres error logs via the Supabase Management API,
 * classifies each error line against known drift signatures, links each to the
 * ISA 315 assertions whose evidence flow it degrades, and upserts a row into
 * lifecycle_issues keyed by the natural (fingerprint × hour bucket) unique index.
 *
 * Auth: mirrors app/api/cron/subscription-purge-executor/route.ts exactly —
 * x-cron-secret or Authorization: Bearer header matches process.env.CRON_SECRET.
 *
 * Runs at `10 * * * *` — offset ten minutes from :00 so it doesn't compete with
 * /api/quickbooks/cdc (which runs at 0 * * * *).
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { classifyBatch, type DriftSignature } from "@/lib/schema-drift/patterns";
import { resolveAssertionImpact } from "@/lib/schema-drift/assertion-linkage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

/**
 * Fetch the last hour of postgres logs via the Supabase Management API.
 * Requires SUPABASE_MANAGEMENT_API_TOKEN + SUPABASE_PROJECT_REF env vars.
 * Returns just the message strings; caller classifies them.
 *
 * On any failure returns an empty array — the cron is best-effort and must
 * not block on log-service issues. A structured "log_fetch_failed" issue is
 * emitted separately so we can see when the detector itself is degraded.
 */
async function fetchPostgresErrorLines(): Promise<{ lines: string[]; fetchError?: string }> {
  const token = process.env.SUPABASE_MANAGEMENT_API_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!token || !projectRef) {
    return { lines: [], fetchError: "missing_management_api_env" };
  }
  try {
    // Supabase logs API: /v1/projects/{ref}/analytics/endpoints/logs.all
    // Query for postgres service, ERROR level, last 60 minutes.
    const url = new URL(`https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/logs.all`);
    const sql = `select event_message from postgres_logs where parsed.error_severity = 'ERROR' and timestamp > now() - interval '60 minutes' limit 500`;
    url.searchParams.set("sql", sql);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { lines: [], fetchError: `management_api_${res.status}` };
    }
    const body = (await res.json()) as { result?: Array<{ event_message?: string }> };
    const lines = (body.result ?? [])
      .map((r) => r.event_message ?? "")
      .filter((s) => s.length > 0);
    return { lines };
  } catch (err) {
    return { lines: [], fetchError: err instanceof Error ? err.message : "unknown" };
  }
}

interface UpsertResult {
  fingerprint: string;
  driftClass: string;
  subject: string;
  inserted: boolean;
  assertionsImpacted: readonly string[];
}

async function upsertDriftIssue(sig: DriftSignature): Promise<UpsertResult> {
  const db = createServiceClient();
  const assertions = resolveAssertionImpact(sig.table);
  const nowIso = new Date().toISOString();

  // The lifecycle_issues_fingerprint_hour_uidx unique index is
  // (fingerprint, date_trunc('hour', UTC timezone(detected_at))). Repeated
  // occurrences within the same hour are deduplicated by the DB, not by us.
  const { error, data } = await db
    .from("lifecycle_issues")
    .insert({
      detected_at: nowIso,
      fingerprint: sig.fingerprint,
      level: "warning",
      issue_kind: "schema_drift",
      pilot_slot_id: null,
      company_id: null,
      firm_id: null,
      tags: {
        drift_class: sig.driftClass,
        subject: sig.subject,
        table: sig.table ?? null,
        schema: sig.schema ?? null,
        assertions_impacted: assertions,
      },
      extra: {
        message: `Schema drift detected: ${sig.driftClass} on ${sig.table ?? "?"}.${sig.subject}`,
        raw_line: sig.rawLine,
        assertion_ids: assertions,
        detector_version: "1.0.0",
        remediation_hint: remediationHint(sig),
      },
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Duplicate hour-bucket → treat as "already recorded this hour," which is
    // exactly the semantic we want. Postgres unique_violation code = 23505.
    if ((error as { code?: string }).code === "23505") {
      return {
        fingerprint: sig.fingerprint,
        driftClass: sig.driftClass,
        subject: sig.subject,
        inserted: false,
        assertionsImpacted: assertions,
      };
    }
    throw new Error(`upsertDriftIssue: ${error.message}`);
  }

  return {
    fingerprint: sig.fingerprint,
    driftClass: sig.driftClass,
    subject: sig.subject,
    inserted: Boolean(data?.id),
    assertionsImpacted: assertions,
  };
}

function remediationHint(sig: DriftSignature): string {
  switch (sig.driftClass) {
    case "column_missing":
      return `Run migration to add column "${sig.subject}" to ${sig.table ?? "?"} OR update code references to remove/rename.`;
    case "relation_missing":
      return `Table/view "${sig.schema ?? "public"}.${sig.subject}" is referenced in code but missing from live schema. Apply the migration that creates it, or remove the reference.`;
    case "function_missing":
      return `Function "${sig.subject}" not found. If it lives in a non-public schema (e.g. extensions), add that schema to the search_path for the calling role.`;
    case "search_path_missing":
      return `Session search_path references schema "${sig.subject}" which doesn't exist. Ad-hoc admin sessions must set search_path=public,extensions,pg_temp.`;
    case "type_mismatch":
      return `Column "${sig.subject}" type differs from what the query expects. Confirm migration order and cast explicitly.`;
    default:
      return "Investigate manually — signature did not match a known remediation class.";
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { lines, fetchError } = await fetchPostgresErrorLines();
  if (fetchError) {
    // Detector self-degradation — record it so it's visible in lifecycle_issues.
    const db = createServiceClient();
    await db
      .from("lifecycle_issues")
      .insert({
        detected_at: new Date().toISOString(),
        fingerprint: `schema-drift-detector:log_fetch_failed:${fetchError}`,
        level: "info",
        issue_kind: "schema_drift_detector_degraded",
        pilot_slot_id: null,
        company_id: null,
        firm_id: null,
        tags: { drift_class: "detector_degraded", fetch_error: fetchError },
        extra: {
          detector_version: "1.0.0",
          remediation_hint:
            "Verify SUPABASE_MANAGEMENT_API_TOKEN + SUPABASE_PROJECT_REF env vars.",
        },
      })
      .then(
        () => undefined,
        () => undefined,
      ); // best-effort
    return NextResponse.json({
      ok: true,
      scanned: 0,
      drifted: 0,
      fetch_error: fetchError,
    });
  }

  const signatures = classifyBatch(lines);
  const results: UpsertResult[] = [];
  for (const sig of signatures) {
    try {
      results.push(await upsertDriftIssue(sig));
    } catch {
      // One signature failing must not block the batch.
      results.push({
        fingerprint: sig.fingerprint,
        driftClass: sig.driftClass,
        subject: sig.subject,
        inserted: false,
        assertionsImpacted: [],
      });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned_lines: lines.length,
    signatures_matched: signatures.length,
    signatures_inserted: results.filter((r) => r.inserted).length,
    results,
  });
}

export async function GET(req: Request): Promise<Response> {
  return POST(req);
}
