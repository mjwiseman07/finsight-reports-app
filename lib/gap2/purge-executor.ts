/**
 * Gap 2 — Subscription lifecycle purge executor.
 * Reads gap2_purge_table_registry and deletes firm-scoped rows by scope_kind.
 */
import { createServiceClient } from "@/lib/supabase/service";

export type PurgeExecutorResult = {
  schedule_id: string;
  firm_id: string;
  tables_purged: Array<{ table_name: string; rows_deleted: number }>;
  status: "completed" | "failed";
  error?: string;
};

type RegistryRow = {
  table_name: string;
  scope_kind: string;
  scope_column: string;
  delete_order: number;
};

export async function executePurge(schedule_id: string): Promise<PurgeExecutorResult> {
  const supabase = createServiceClient();

  const { data: schedule, error: schedErr } = await supabase
    .from("subscription_purge_schedule")
    .select("*")
    .eq("id", schedule_id)
    .single();

  if (schedErr || !schedule) {
    throw new Error(`Schedule ${schedule_id} not found: ${schedErr?.message}`);
  }

  if (schedule.status !== "scheduled") {
    return {
      schedule_id,
      firm_id: schedule.firm_id as string,
      tables_purged: [],
      status: "failed",
      error: `Schedule status is ${schedule.status}, not 'scheduled'`,
    };
  }

  const firmId = schedule.firm_id as string;

  const { data: firm } = await supabase
    .from("firms")
    .select("id, legal_hold_reason")
    .eq("id", firmId)
    .maybeSingle();

  if (firm?.legal_hold_reason) {
    await supabase.from("subscription_purge_audit").insert({
      schedule_id,
      firm_id: firmId,
      event_type: "legal_hold_applied",
      actor_type: "system_cron",
      details: { legal_hold_reason: firm.legal_hold_reason, blocked: true },
    });
    return {
      schedule_id,
      firm_id: firmId,
      tables_purged: [],
      status: "failed",
      error: `Legal hold blocks purge: ${firm.legal_hold_reason}`,
    };
  }

  await supabase
    .from("subscription_purge_schedule")
    .update({
      status: "executing",
      execution_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", schedule_id);

  await supabase.from("subscription_purge_audit").insert({
    schedule_id,
    firm_id: firmId,
    event_type: "purge_started",
    actor_type: "system_cron",
    details: { grace_until: schedule.grace_until },
  });

  const { data: registry } = await supabase
    .from("gap2_purge_table_registry")
    .select("table_name, scope_kind, scope_column, delete_order")
    .eq("active", true)
    .order("delete_order", { ascending: true });

  if (!registry?.length) {
    throw new Error("gap2_purge_table_registry is empty or unreadable");
  }

  const firmClientIds = await loadFirmClientIds(supabase, firmId);
  const engagementIds = await loadEngagementIds(supabase, firmId);
  const memberUserIds = await loadMemberUserIds(supabase, firmId);
  const subscriptionIds = await loadSubscriptionIds(supabase, firmId);

  const tables_purged: Array<{ table_name: string; rows_deleted: number }> = [];

  try {
    for (const row of registry as RegistryRow[]) {
      try {
        const rows_deleted = await deleteScopedRows(supabase, row, {
          firmId,
          firmClientIds,
          engagementIds,
          memberUserIds,
          subscriptionIds,
        });
        tables_purged.push({ table_name: row.table_name, rows_deleted });
        await supabase.from("subscription_purge_audit").insert({
          schedule_id,
          firm_id: firmId,
          event_type: "table_purged",
          table_name: row.table_name,
          rows_deleted,
          actor_type: "system_cron",
          details: { delete_order: row.delete_order, scope_kind: row.scope_kind },
        });
      } catch (err) {
        await supabase.from("subscription_purge_audit").insert({
          schedule_id,
          firm_id: firmId,
          event_type: "purge_failed",
          table_name: row.table_name,
          actor_type: "system_cron",
          details: {
            error: err instanceof Error ? err.message : String(err),
            delete_order: row.delete_order,
          },
        });
      }
    }

    await supabase
      .from("subscription_purge_schedule")
      .update({
        status: "completed",
        execution_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", schedule_id);

    // Firm row may already be deleted; best-effort stamp.
    await supabase
      .from("firms")
      .update({
        purge_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", firmId);

    await supabase.from("subscription_purge_audit").insert({
      schedule_id,
      firm_id: firmId,
      event_type: "purge_completed",
      actor_type: "system_cron",
      details: {
        tables_purged: tables_purged.length,
        total_rows_deleted: tables_purged.reduce((sum, t) => sum + t.rows_deleted, 0),
      },
    });

    return { schedule_id, firm_id: firmId, tables_purged, status: "completed" };
  } catch (err) {
    await supabase
      .from("subscription_purge_schedule")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", schedule_id);
    await supabase.from("subscription_purge_audit").insert({
      schedule_id,
      firm_id: firmId,
      event_type: "purge_failed",
      actor_type: "system_cron",
      details: { error: err instanceof Error ? err.message : String(err) },
    });
    return {
      schedule_id,
      firm_id: firmId,
      tables_purged,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

type ScopeCtx = {
  firmId: string;
  firmClientIds: string[];
  engagementIds: string[];
  memberUserIds: string[];
  subscriptionIds: string[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteScopedRows(supabase: any, row: RegistryRow, ctx: ScopeCtx): Promise<number> {
  const col = row.scope_column;

  if (row.scope_kind === "firm_pk" || row.scope_kind === "firm_id") {
    const { count, error } = await supabase
      .from(row.table_name)
      .delete({ count: "exact" })
      .eq(col, ctx.firmId);
    if (error) throw error;
    return count ?? 0;
  }

  if (row.scope_kind === "firm_client_id") {
    if (ctx.firmClientIds.length === 0) return 0;
    const { count, error } = await supabase
      .from(row.table_name)
      .delete({ count: "exact" })
      .in(col, ctx.firmClientIds);
    if (error) throw error;
    return count ?? 0;
  }

  if (row.scope_kind === "engagement_id") {
    if (ctx.engagementIds.length === 0) return 0;
    const { count, error } = await supabase
      .from(row.table_name)
      .delete({ count: "exact" })
      .in(col, ctx.engagementIds);
    if (error) throw error;
    return count ?? 0;
  }

  if (row.scope_kind === "user_via_membership") {
    if (ctx.memberUserIds.length === 0) return 0;
    const { count, error } = await supabase
      .from(row.table_name)
      .delete({ count: "exact" })
      .in(col, ctx.memberUserIds);
    if (error) throw error;
    return count ?? 0;
  }

  if (row.scope_kind === "subscription_via_subscriber") {
    if (row.table_name === "subscription_items") {
      if (ctx.subscriptionIds.length === 0) return 0;
      const { count, error } = await supabase
        .from("subscription_items")
        .delete({ count: "exact" })
        .in("subscription_id", ctx.subscriptionIds);
      if (error) throw error;
      return count ?? 0;
    }
    const { count, error } = await supabase
      .from("subscriptions")
      .delete({ count: "exact" })
      .eq("subscriber_type", "firm")
      .eq("subscriber_id", ctx.firmId);
    if (error) throw error;
    return count ?? 0;
  }

  throw new Error(`Unknown scope_kind ${row.scope_kind}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadFirmClientIds(supabase: any, firmId: string): Promise<string[]> {
  const { data } = await supabase.from("firm_clients").select("id").eq("firm_id", firmId);
  return (data ?? []).map((r: { id: string }) => r.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadEngagementIds(supabase: any, firmId: string): Promise<string[]> {
  const { data } = await supabase.from("engagements").select("id").eq("firm_id", firmId);
  return (data ?? []).map((r: { id: string }) => r.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadMemberUserIds(supabase: any, firmId: string): Promise<string[]> {
  const [{ data: members }, { data: firm }] = await Promise.all([
    supabase.from("firm_memberships").select("user_id").eq("firm_id", firmId),
    supabase.from("firms").select("owner_user_id").eq("id", firmId).maybeSingle(),
  ]);
  const ids = new Set<string>();
  for (const m of members ?? []) {
    if (m.user_id) ids.add(m.user_id as string);
  }
  if (firm?.owner_user_id) ids.add(firm.owner_user_id as string);
  return [...ids];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadSubscriptionIds(supabase: any, firmId: string): Promise<string[]> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("subscriber_type", "firm")
    .eq("subscriber_id", firmId);
  return (data ?? []).map((r: { id: string }) => r.id);
}
