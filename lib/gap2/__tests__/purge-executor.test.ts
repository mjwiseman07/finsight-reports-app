import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  schedule: null as Record<string, unknown> | null,
  firm: null as Record<string, unknown> | null,
  registry: [] as Array<Record<string, unknown>>,
  audit: [] as Array<Record<string, unknown>>,
  deletes: [] as Array<{ table: string; filter: string }>,
  firmClients: [] as Array<{ id: string }>,
  engagements: [] as Array<{ id: string }>,
  memberships: [] as Array<{ user_id: string }>,
  subscriptions: [] as Array<{ id: string }>,
}));

function makeQuery(table: string) {
  const filters: Array<{ op: string; col: string; val: unknown }> = [];
  const api: Record<string, unknown> = {};
  const run = async () => {
    if (table === "subscription_purge_schedule") {
      if ((api as { _op?: string })._op === "update") {
        Object.assign(state.schedule ?? {}, (api as { _patch?: Record<string, unknown> })._patch);
        return { data: state.schedule, error: null, count: null };
      }
      return { data: state.schedule, error: state.schedule ? null : { message: "missing" }, count: null };
    }
    if (table === "firms") {
      if ((api as { _op?: string })._op === "delete") {
        state.deletes.push({ table, filter: "firm_pk" });
        return { data: null, error: null, count: 1 };
      }
      if ((api as { _op?: string })._op === "update") {
        Object.assign(state.firm ?? {}, (api as { _patch?: Record<string, unknown> })._patch);
        return { data: state.firm, error: null };
      }
      return { data: state.firm, error: null };
    }
    if (table === "engagements") {
      if ((api as { _op?: string })._op === "delete") {
        state.deletes.push({ table, filter: "firm_id" });
        return { data: null, error: null, count: 1 };
      }
      return { data: state.engagements, error: null };
    }
    if (table === "gap2_purge_table_registry") {
      return { data: state.registry, error: null };
    }
    if (table === "subscription_purge_audit") {
      if ((api as { _op?: string })._op === "insert") {
        state.audit.push((api as { _row?: Record<string, unknown> })._row!);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }
    if (table === "firm_clients") return { data: state.firmClients, error: null };
    if (table === "firm_memberships") return { data: state.memberships, error: null };
    if (table === "subscriptions") {
      if ((api as { _op?: string })._op === "delete") {
        state.deletes.push({ table, filter: "subscriber" });
        return { data: null, error: null, count: state.subscriptions.length };
      }
      return { data: state.subscriptions, error: null };
    }
    if ((api as { _op?: string })._op === "delete") {
      state.deletes.push({ table, filter: JSON.stringify(filters) });
      return { data: null, error: null, count: 1 };
    }
    return { data: null, error: null, count: 0 };
  };

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      filters.push({ op: "eq", col, val });
      return chain;
    },
    in: (col: string, val: unknown) => {
      filters.push({ op: "in", col, val });
      return chain;
    },
    order: () => chain,
    maybeSingle: run,
    single: run,
    update: (patch: Record<string, unknown>) => {
      (api as { _op: string; _patch: Record<string, unknown> })._op = "update";
      (api as { _patch: Record<string, unknown> })._patch = patch;
      return chain;
    },
    insert: (row: Record<string, unknown>) => {
      (api as { _op: string; _row: Record<string, unknown> })._op = "insert";
      (api as { _row: Record<string, unknown> })._row = row;
      return run();
    },
    delete: (opts?: { count?: string }) => {
      (api as { _op: string })._op = "delete";
      void opts;
      return chain;
    },
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      run().then(resolve, reject),
  };
  return chain;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => makeQuery(table),
  }),
}));

import { executePurge } from "../purge-executor";

describe("executePurge", () => {
  beforeEach(() => {
    state.schedule = {
      id: "sched-1",
      firm_id: "firm-1",
      status: "scheduled",
      grace_until: "2026-01-01T00:00:00Z",
    };
    state.firm = { id: "firm-1", legal_hold_reason: null, owner_user_id: "u1" };
    state.registry = [
      {
        table_name: "je_line_evidence",
        scope_kind: "firm_client_id",
        scope_column: "firm_client_id",
        delete_order: 11,
      },
      {
        table_name: "engagements",
        scope_kind: "firm_id",
        scope_column: "firm_id",
        delete_order: 100,
      },
      {
        table_name: "firms",
        scope_kind: "firm_pk",
        scope_column: "id",
        delete_order: 999,
      },
    ];
    state.audit = [];
    state.deletes = [];
    state.firmClients = [{ id: "fc1" }];
    state.engagements = [{ id: "eng1" }];
    state.memberships = [{ user_id: "u1" }];
    state.subscriptions = [{ id: "sub1" }];
  });

  it("respects legal hold and does not delete", async () => {
    state.firm = { id: "firm-1", legal_hold_reason: "subpoena" };
    const r = await executePurge("sched-1");
    expect(r.status).toBe("failed");
    expect(r.error).toMatch(/Legal hold/);
    expect(state.deletes).toHaveLength(0);
    expect(state.audit.some((a) => a.event_type === "legal_hold_applied")).toBe(true);
  });

  it("deletes tables in delete_order ascending", async () => {
    const r = await executePurge("sched-1");
    expect(r.status).toBe("completed");
    expect(state.deletes.map((d) => d.table)).toEqual([
      "je_line_evidence",
      "engagements",
      "firms",
    ]);
  });

  it("writes table_purged audit row for each table", async () => {
    await executePurge("sched-1");
    const purged = state.audit.filter((a) => a.event_type === "table_purged");
    expect(purged).toHaveLength(3);
    expect(purged.every((a) => typeof a.rows_deleted === "number")).toBe(true);
  });
});
