/**
 * Records a lifecycle_issues row (authoritative) and best-effort forwards
 * to Sentry SaaS. DB write always happens when partition is known; Sentry is optional.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export type IssueLevel = "info" | "warning" | "error" | "fatal";

export type IssueKind =
  | "pilot.lifecycle.drift.detected"
  | "pilot.lifecycle.transition.rejected"
  | "pilot.lifecycle.chain.integrity.broken"
  | "pilot.lifecycle.monitor.error"
  | "pilot.lifecycle.chain.anchor"
  | "marketing.seo.drift";

export type IssueInput = {
  fingerprint: string;
  level: IssueLevel;
  issueKind: IssueKind;
  pilotSlotId?: string | null;
  companyId?: string | null;
  firmId?: string | null;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  message: string;
};

export type IssueRecordResult = {
  id: string | null;
  deduped: boolean;
  sentryEventId: string | null;
};

async function forwardToSentryBestEffort(
  input: IssueInput,
): Promise<string | null> {
  if (!process.env.SENTRY_DSN) return null;
  try {
    const sentryModuleName = "@sentry/nextjs";
    const Sentry = (await import(sentryModuleName)) as {
      captureMessage?: (
        msg: string,
        ctx?: {
          level?: string;
          tags?: Record<string, string>;
          extra?: Record<string, unknown>;
          fingerprint?: string[];
        },
      ) => string | undefined;
    };
    const eventId = Sentry.captureMessage?.(input.message, {
      level: input.level,
      tags: {
        ...(input.tags ?? {}),
        issue_kind: input.issueKind,
        ...(input.companyId ? { company_id: input.companyId } : {}),
        ...(input.firmId ? { firm_id: input.firmId } : {}),
      },
      extra: input.extra,
      fingerprint: [input.fingerprint],
    });
    return eventId ?? null;
  } catch {
    return null;
  }
}

export async function recordIssue(
  input: IssueInput,
): Promise<IssueRecordResult> {
  const isPartitionless =
    input.issueKind === "marketing.seo.drift" ||
    input.issueKind === "pilot.lifecycle.chain.anchor";
  if (!isPartitionless && !input.companyId && !input.firmId) {
    throw new Error(
      "recordIssue: at least one of companyId or firmId is required",
    );
  }

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("lifecycle_issues")
    .insert({
      fingerprint: input.fingerprint,
      level: input.level,
      issue_kind: input.issueKind,
      pilot_slot_id: input.pilotSlotId ?? null,
      company_id: input.companyId ?? null,
      firm_id: input.firmId ?? null,
      tags: input.tags ?? {},
      extra: { ...(input.extra ?? {}), message: input.message },
    })
    .select("id")
    .maybeSingle();

  const isDupe =
    !!error &&
    (error.code === "23505" || /duplicate key/i.test(error.message));

  const sentryEventId = await forwardToSentryBestEffort(input);

  if (data?.id && sentryEventId) {
    await admin
      .from("lifecycle_issues")
      .update({ sentry_event_id: sentryEventId })
      .eq("id", data.id);
  }

  if (error && !isDupe) {
    console.error("[issue-recorder] insert failed", {
      fingerprint: input.fingerprint,
      code: error.code,
      message: error.message,
    });
    return { id: null, deduped: false, sentryEventId };
  }

  return {
    id: data?.id ?? null,
    deduped: isDupe,
    sentryEventId,
  };
}
