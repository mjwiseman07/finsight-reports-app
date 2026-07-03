// D6.3 — application-layer inline hooks that fire the D6 rule runner whenever a
// JE lands in QBO through the app (proposal accept/modify, recurring auto-post),
// plus a manual entry point for the review UI (D6.5).
//
// Contract: the proposal/recurring trigger functions NEVER throw. A JE has
// already landed; a rule-run failure must not surface to the user or break the
// accept/post UX. All errors are caught, logged, and best-effort sent to Sentry.
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import type { RunOptions, RunSummary } from "@/lib/rules/runner/types";
import { resolveClosePeriodForDate } from "@/lib/close-periods/resolve-for-date";

export type TriggerSource =
  | "uncategorized_accepted"
  | "uncategorized_modified"
  | "recurring_posted"
  | "manual"
  | "scheduled";

const SOURCE_TO_TRIGGER: Record<TriggerSource, RunOptions["trigger"]> = {
  uncategorized_accepted: "proposal_created",
  uncategorized_modified: "proposal_created",
  recurring_posted: "recurring_fire_created",
  manual: "on_demand",
  scheduled: "scheduled",
};

/** Best-effort Sentry capture mirroring the runner's runtime-string pattern. */
async function captureExceptionBestEffort(
  err: unknown,
  tags: Record<string, string>,
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const sentryModuleName = "@sentry/nextjs";
    const Sentry = (await import(sentryModuleName)) as {
      captureException?: (e: unknown, ctx?: { tags?: Record<string, string> }) => void;
    };
    Sentry.captureException?.(err, { tags });
  } catch {
    // Sentry not installed / not configured — log-only.
  }
}

async function logSilently(err: unknown, tags: Record<string, string>): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.warn("[d6.3] rule_run_trigger_failed", { ...tags, message });
  await captureExceptionBestEffort(err, { rule_run_trigger_failed: "1", ...tags });
}

/**
 * Resolve the close period for a date and run the rules. Throws on failure so
 * the caller can decide how to handle it (proposal/recurring wrappers swallow;
 * the manual endpoint surfaces).
 */
async function runForDate(
  firmClientId: string,
  date: string,
  source: TriggerSource,
  link: { proposalId?: string; recurringFireId?: string },
): Promise<RunSummary | null> {
  const cp = await resolveClosePeriodForDate(firmClientId, date);
  if (!cp) {
    // eslint-disable-next-line no-console
    console.warn("[d6.3] no_close_period", { firmClientId, date, source });
    return null;
  }
  const supabase = getSupabaseAdmin();
  return executeRules(supabase, {
    firmClientId,
    closePeriodId: cp.close_period_id,
    trigger: SOURCE_TO_TRIGGER[source],
    proposalId: link.proposalId,
    recurringFireId: link.recurringFireId,
  });
}

/**
 * Fire the runner for an accepted/modified uncategorized proposal. No-op (silent)
 * for any other status or unknown proposal. Never throws.
 */
export async function triggerRunnerForProposal(proposalId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: proposal } = await supabase
      .from("uncategorized_proposals")
      .select("proposal_id, firm_client_id, txn_date, status")
      .eq("proposal_id", proposalId)
      .maybeSingle();

    if (!proposal) return;
    const status = String(proposal.status);
    if (status !== "accepted" && status !== "modified") return;

    const source: TriggerSource =
      status === "modified" ? "uncategorized_modified" : "uncategorized_accepted";
    await runForDate(String(proposal.firm_client_id), String(proposal.txn_date), source, {
      proposalId,
    });
  } catch (err) {
    await logSilently(err, { trigger: "proposal", proposal_id: proposalId });
  }
}

/**
 * Fire the runner for a recurring fire that posted a JE. No-op (silent) for any
 * other status or unknown fire. Never throws.
 */
export async function triggerRunnerForRecurringFire(fireId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: fire } = await supabase
      .from("recurring_fires")
      .select("fire_id, firm_client_id, fire_date, status")
      .eq("fire_id", fireId)
      .maybeSingle();

    if (!fire) return;
    if (String(fire.status) !== "posted") return;

    await runForDate(String(fire.firm_client_id), String(fire.fire_date), "recurring_posted", {
      recurringFireId: fireId,
    });
  } catch (err) {
    await logSilently(err, { trigger: "recurring", fire_id: fireId });
  }
}

/**
 * Run the rules for an explicit close period. Used by the manual endpoint, which
 * awaits a synchronous RunSummary — this variant may throw so the endpoint can
 * map failures to a 500.
 */
export async function triggerRunnerForClosePeriod(
  firmClientId: string,
  closePeriodId: string,
  source: TriggerSource,
): Promise<RunSummary> {
  const supabase = getSupabaseAdmin();
  return executeRules(supabase, {
    firmClientId,
    closePeriodId,
    trigger: SOURCE_TO_TRIGGER[source],
  });
}
