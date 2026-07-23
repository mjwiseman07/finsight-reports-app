import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { runBsSummaryResolver } from "@/lib/audit-ready/tie-out/bs-summary-resolver";
import type { PolicySnapshot } from "@/lib/audit-ready/tie-out/policy";
import {
  sendBsReconTieEmail,
  sendBsReconKickoutEmail,
  sendBsReconFailureAlert,
  resolveBookkeeperEmail,
} from "@/lib/audit-ready/tie-out/bs-recon-notify";
import { sendFounderAlert } from "@/lib/founder-alerts.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Counter semantics (clean, no decrement hacks):
 * - attempted  = engagements where runBsSummaryResolver was invoked
 * - skipped    = gated out before resolver (entitlement / QBO / no actor)
 * - succeeded_* / failed = outcomes among attempted
 */

interface EnumeratedEngagement {
  engagement_id: string;
  firm_client_id: string;
  owner_user_id: string | null;
  firm_id: string | null;
  client_name: string;
  entitlement_flags: Record<string, unknown> | null;
}

interface CronRunCounters {
  attempted: number;
  succeeded_tie: number;
  succeeded_kickout: number;
  failed: number;
  skipped: number;
}

function computeAsOfDate(): string {
  const now = new Date();
  const firstOfCurrent = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const lastOfPrior = new Date(firstOfCurrent.getTime() - 24 * 60 * 60 * 1000);
  return lastOfPrior.toISOString().slice(0, 10);
}

function isArEntitled(
  flags: Record<string, unknown> | null,
): { entitled: boolean; reason: string } {
  if (flags === null) {
    return { entitled: true, reason: "entitlement_missing_treated_as_entitled" };
  }
  const enabled = flags["audit_ready_enabled"] === true;
  return {
    entitled: enabled,
    reason: enabled ? "ar_entitled" : "no_ar_entitlement",
  };
}

async function resolveTriggeredByUserId(
  eng: EnumeratedEngagement,
): Promise<string | null> {
  if (eng.owner_user_id) return eng.owner_user_id;
  if (!eng.firm_id) return null;
  const supabase = getSupabaseAdmin();
  const { data: memberships } = await supabase
    .from("firm_memberships")
    .select("user_id")
    .eq("firm_id", eng.firm_id)
    .eq("role", "firm_admin")
    .limit(1);
  return (memberships?.[0]?.user_id as string | undefined) ?? null;
}

export async function POST(req: Request) {
  // 1. Auth
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Feature flag
  if (process.env.ENABLE_BS_RECON_CRON !== "true") {
    return NextResponse.json({
      status: "disabled",
      message: "ENABLE_BS_RECON_CRON not true",
    });
  }

  const cronStart = Date.now();
  const asOfDate = computeAsOfDate();
  const targetEngagementId =
    process.env.BS_RECON_CRON_TARGET_ENGAGEMENT_ID?.trim() || null;
  const supabase = getSupabaseAdmin();

  // 3. Insert initial cron run row
  const { data: cronRunRow, error: cronRunErr } = await supabase
    .from("audit_ready_cron_runs")
    .insert({
      cron_name: "bs_recon_monthly",
      as_of_date: asOfDate,
    })
    .select("id")
    .single();

  if (cronRunErr || !cronRunRow) {
    console.error("[bs-recon-cron] Failed to insert cron run row", cronRunErr);
    return NextResponse.json(
      { error: "cron_run_insert_failed", detail: cronRunErr?.message },
      { status: 500 },
    );
  }

  const cronRunId = cronRunRow.id as string;
  const counters: CronRunCounters = {
    attempted: 0,
    succeeded_tie: 0,
    succeeded_kickout: 0,
    failed: 0,
    skipped: 0,
  };
  const errorLines: string[] = [];

  try {
    // 4. Enumerate engagements
    let query = supabase
      .from("audit_ready_engagements")
      .select(
        `
        id,
        firm_client_id,
        firm_clients:firm_client_id (
          id,
          owner_user_id,
          firm_id,
          name
        )
      `,
      )
      .eq("status", "open");

    if (targetEngagementId) {
      query = query.eq("id", targetEngagementId);
    }

    const { data: rawEngagements, error: enumErr } = await query;
    if (enumErr) {
      throw new Error(`enumeration_failed: ${enumErr.message}`);
    }

    const engagements: EnumeratedEngagement[] = (rawEngagements ?? []).map(
      (row: {
        id: string;
        firm_client_id: string;
        firm_clients?: {
          owner_user_id?: string | null;
          firm_id?: string | null;
          name?: string | null;
        } | null;
      }) => ({
        engagement_id: row.id,
        firm_client_id: row.firm_client_id,
        owner_user_id: row.firm_clients?.owner_user_id ?? null,
        firm_id: row.firm_clients?.firm_id ?? null,
        client_name: row.firm_clients?.name ?? "(unknown)",
        entitlement_flags: null,
      }),
    );

    // Batch-fetch entitlements once per firm to avoid N+1
    const uniqueFirmIds = Array.from(
      new Set(
        engagements
          .map((e) => e.firm_id)
          .filter((id): id is string => !!id),
      ),
    );
    if (uniqueFirmIds.length > 0) {
      const { data: entitlementRows } = await supabase
        .from("entitlements")
        .select("subscriber_id, flags")
        .eq("subscriber_type", "firm")
        .in("subscriber_id", uniqueFirmIds);
      const flagsByFirmId = new Map<string, Record<string, unknown>>();
      for (const row of entitlementRows ?? []) {
        flagsByFirmId.set(
          row.subscriber_id as string,
          (row.flags as Record<string, unknown>) ?? {},
        );
      }
      for (const e of engagements) {
        if (e.firm_id && flagsByFirmId.has(e.firm_id)) {
          e.entitlement_flags = flagsByFirmId.get(e.firm_id) ?? null;
        }
      }
    }

    // 5. Per-engagement processing
    for (const eng of engagements) {
      // Gate 1: AR entitlement
      const arCheck = isArEntitled(eng.entitlement_flags);
      if (!arCheck.entitled) {
        counters.skipped++;
        console.log("[bs-recon-cron] skipped", {
          engagement_id: eng.engagement_id,
          reason: arCheck.reason,
        });
        continue;
      }
      if (arCheck.reason === "entitlement_missing_treated_as_entitled") {
        console.log(
          "[bs-recon-cron] treating missing entitlement as entitled (pilot compat)",
          {
            engagement_id: eng.engagement_id,
            firm_id: eng.firm_id,
          },
        );
      }

      // Gate 2: actor for triggeredByUserId (FK to auth.users)
      const triggeredByUserId = await resolveTriggeredByUserId(eng);
      if (!triggeredByUserId) {
        counters.skipped++;
        console.log("[bs-recon-cron] skipped", {
          engagement_id: eng.engagement_id,
          reason: "no_triggered_by_user",
        });
        continue;
      }

      // Gate 3: QBO connection + policy (required by resolver)
      let token: { accessToken: string; realmId: string };
      try {
        const resolved = await resolveQBOTokenForFirmClient(eng.firm_client_id);
        if (!resolved?.accessToken || !resolved.realmId) {
          counters.skipped++;
          console.log("[bs-recon-cron] skipped", {
            engagement_id: eng.engagement_id,
            reason: "no_qbo_connection",
          });
          continue;
        }
        token = {
          accessToken: resolved.accessToken,
          realmId: resolved.realmId,
        };
      } catch (e: unknown) {
        counters.skipped++;
        const msg = e instanceof Error ? e.message : String(e);
        console.log("[bs-recon-cron] skipped", {
          engagement_id: eng.engagement_id,
          reason: "no_qbo_connection",
          error: msg,
        });
        continue;
      }

      const { data: policy } = await supabase
        .from("audit_ready_tie_out_policies")
        .select(
          "policy_mode, auto_reconcile_max_dollar, auto_reconcile_max_percent, kickout_min_dollar, kickout_min_percent, authoritative_comparison",
        )
        .eq("engagement_id", eng.engagement_id)
        .maybeSingle();

      if (!policy) {
        counters.skipped++;
        console.log("[bs-recon-cron] skipped", {
          engagement_id: eng.engagement_id,
          reason: "no_tolerance_policy",
        });
        continue;
      }

      // 6. Run resolver (only now counts as attempted)
      counters.attempted++;
      try {
        const result = await runBsSummaryResolver({
          engagementId: eng.engagement_id,
          realmId: token.realmId,
          accessToken: token.accessToken,
          asOfDate,
          policy: policy as PolicySnapshot & { policy_mode: string },
          triggeredByUserId,
          triggerReason: "scheduled",
        });

        if (result.status === "failed") {
          throw new Error(
            `${result.errorCode}: ${result.errorMessage}`,
          );
        }

        const isTie =
          result.totalsStatus === "tie" &&
          result.bsEquationVarianceCents === 0;
        const artifactId = result.summaryArtifactId;
        const pdfObjectKey = result.storageObjectKey;

        let totalsVarianceCents = 0;
        if (!isTie) {
          const { data: runRow } = await supabase
            .from("audit_ready_tie_out_runs")
            .select("totals_variance_cents")
            .eq("id", result.runId)
            .maybeSingle();
          totalsVarianceCents =
            (runRow?.totals_variance_cents as number | null) ?? 0;
        }

        // 7. Resolve recipient + notify
        const { email, source } = await resolveBookkeeperEmail({
          ownerUserId: eng.owner_user_id,
          firmId: eng.firm_id,
        });

        if (!email) {
          console.warn("[bs-recon-cron] no recipient email", {
            engagement_id: eng.engagement_id,
          });
          await sendBsReconFailureAlert({
            clientName: eng.client_name,
            engagementId: eng.engagement_id,
            asOfDate,
            error: new Error(
              `No recipient email resolved (owner_user_id=${eng.owner_user_id}, firm_id=${eng.firm_id})`,
            ),
          });
        } else if (isTie) {
          await sendBsReconTieEmail({
            toEmail: email,
            clientName: eng.client_name,
            asOfDate,
            accountCount: result.accountCountTotal,
            engagementId: eng.engagement_id,
            artifactId,
            pdfObjectKey,
          });
        } else {
          await sendBsReconKickoutEmail({
            toEmail: email,
            clientName: eng.client_name,
            asOfDate,
            kickoutCount: result.accountCountKickout,
            totalsVarianceCents,
            bsEquationVarianceCents: result.bsEquationVarianceCents,
            engagementId: eng.engagement_id,
            artifactId,
            pdfObjectKey,
          });
        }

        if (isTie) counters.succeeded_tie++;
        else counters.succeeded_kickout++;

        console.log("[bs-recon-cron] engagement_complete", {
          engagement_id: eng.engagement_id,
          outcome: isTie ? "tie" : "kickout",
          recipient_source: source,
        });
      } catch (e: unknown) {
        counters.failed++;
        const err = e instanceof Error ? e : new Error(String(e));
        const errorMsg = `${eng.client_name} (${eng.engagement_id}): ${err.message}`;
        errorLines.push(errorMsg);
        console.error("[bs-recon-cron] engagement_failed", {
          engagement_id: eng.engagement_id,
          error: err.message,
          stack: err.stack,
        });
        try {
          await sendBsReconFailureAlert({
            clientName: eng.client_name,
            engagementId: eng.engagement_id,
            asOfDate,
            error: err,
          });
        } catch (alertErr: unknown) {
          const alertMsg =
            alertErr instanceof Error ? alertErr.message : String(alertErr);
          console.error("[bs-recon-cron] founder_alert_also_failed", {
            engagement_id: eng.engagement_id,
            alertErr: alertMsg,
          });
        }
      }
    }

    // 8. Update cron run row with final counters
    const durationMs = Date.now() - cronStart;
    await supabase
      .from("audit_ready_cron_runs")
      .update({
        completed_at: new Date().toISOString(),
        engagements_attempted: counters.attempted,
        engagements_succeeded_tie: counters.succeeded_tie,
        engagements_succeeded_kickout: counters.succeeded_kickout,
        engagements_failed: counters.failed,
        engagements_skipped: counters.skipped,
        duration_ms: durationMs,
        error_summary: errorLines.length ? errorLines.join("\n---\n") : null,
      })
      .eq("id", cronRunId);

    return NextResponse.json({
      status: "ok",
      cron_run_id: cronRunId,
      as_of_date: asOfDate,
      counters,
      duration_ms: durationMs,
    });
  } catch (fatalErr: unknown) {
    const err = fatalErr instanceof Error ? fatalErr : new Error(String(fatalErr));
    console.error("[bs-recon-cron] FATAL", err);
    await supabase
      .from("audit_ready_cron_runs")
      .update({
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - cronStart,
        error_summary: `FATAL: ${err.message}\n${err.stack ?? ""}`,
      })
      .eq("id", cronRunId);
    try {
      await sendFounderAlert({
        refundRequestId: null,
        subject: "[Cron Fatal] BS Recon Monthly",
        subjectLine: "[Cron Fatal] BS Recon Monthly",
        body: `Fatal error in bs-recon-monthly cron (as_of=${asOfDate}):\n\n${err.message}\n\n${err.stack ?? "(no stack)"}`,
        context: { cron: "bs_recon_monthly", asOfDate },
      });
    } catch {
      // ignore secondary alert failure
    }
    return NextResponse.json(
      { error: "fatal", detail: err.message },
      { status: 500 },
    );
  }
}

// Vercel Cron invokes GET by default for scheduled jobs.
export async function GET(req: Request) {
  return POST(req);
}
