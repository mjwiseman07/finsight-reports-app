import { vi } from "vitest";

interface Row extends Record<string, unknown> {}

export function makeMockSupabase() {
  const state: Record<string, Row[]> = {
    engagement_addons: [],
    entitlement_check_audit: [],
    stripe_webhook_events: [],
    ledger_events: [],
    ai_action_log: [],
    pilot_feature_allowlist: [],
    requisitions: [],
    requisition_comments: [],
    requisition_amendments: [],
    approval_delegations: [],
    vendor_spend_history: [],
    vendor_credits: [],
    credit_applications: [],
    vendor_prepayment_balances: [],
    prepayment_ledger: [],
    refund_request_drafts: [],
    engagements: [],
  };

  function ensureTable(name: string): Row[] {
    if (!state[name]) state[name] = [];
    return state[name];
  }
  function tbl(name: string) {
    ensureTable(name);
    let limitN: number | undefined;
    let single = false;
    let maybeSingle = false;
    let filters: Array<[string, unknown]> = [];
    let inFilter: [string, unknown[]] | null = null;
    let isFilter: [string, unknown] | null = null;
    let gtFilter: [string, unknown] | null = null;
    let lteFilter: [string, unknown] | null = null;
    let orderCol: string | null = null;
    let orderAsc = true;

    const q: Record<string, unknown> = {
      select(_cols?: string) {
        return q;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return q;
      },
      in(col: string, vals: unknown[]) {
        inFilter = [col, vals];
        return q;
      },
      is(col: string, val: unknown) {
        isFilter = [col, val];
        return q;
      },
      gt(col: string, val: unknown) {
        gtFilter = [col, val];
        return q;
      },
      lte(col: string, val: unknown) {
        lteFilter = [col, val];
        return q;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = opts?.ascending !== false;
        return q;
      },
      limit(n: number) {
        limitN = n;
        return q;
      },
      single() {
        single = true;
        return exec();
      },
      maybeSingle() {
        maybeSingle = true;
        return exec();
      },
      insert(payload: Row | Row[]) {
        const rows = Array.isArray(payload) ? payload : [payload];
        const inserted: Row[] = [];
        for (const r of rows) {
          if (name === "stripe_webhook_events") {
            const existing = state[name].find((x) => x.stripe_event_id === r.stripe_event_id);
            if (existing) {
              return Promise.resolve({
                data: null,
                error: { code: "23505", message: "duplicate key" },
              });
            }
          }
          if (name === "engagement_addons") {
            const dup = state[name].find(
              (x) => x.engagement_id === r.engagement_id && x.addon_code === r.addon_code,
            );
            if (dup) {
              return Promise.resolve({
                data: null,
                error: { code: "23505", message: "unique violation" },
              });
            }
          }
          const row = { ...r, id: r.id ?? crypto.randomUUID() };
          state[name].push(row);
          inserted.push(row);
        }
        const chain = {
          select() {
            return {
              single() {
                return Promise.resolve({ data: inserted[0] ?? null, error: null });
              },
            };
          },
          then(
            resolve: (v: { data: Row[]; error: null }) => unknown,
            reject?: (e: unknown) => unknown,
          ) {
            return Promise.resolve({ data: inserted, error: null }).then(resolve, reject);
          },
        };
        return chain;
      },
      update(patch: Row) {
        const updatePatch = patch;
        const updateFilters: Array<[string, unknown]> = [];
        const applyUpdate = () => {
          let rows = state[name].slice();
          for (const [col, val] of updateFilters) {
            rows = rows.filter((r) => r[col] === val);
          }
          for (const row of rows) Object.assign(row, updatePatch);
          return Promise.resolve({ data: rows, error: null });
        };
        const chain = {
          eq(col: string, val: unknown) {
            updateFilters.push([col, val]);
            return chain;
          },
          select() {
            return {
              maybeSingle() {
                let rows = state[name].slice();
                for (const [col, val] of updateFilters) {
                  rows = rows.filter((r) => r[col] === val);
                }
                for (const row of rows) Object.assign(row, updatePatch);
                return Promise.resolve({ data: rows[0] ?? null, error: null });
              },
              single() {
                let rows = state[name].slice();
                for (const [col, val] of updateFilters) {
                  rows = rows.filter((r) => r[col] === val);
                }
                for (const row of rows) Object.assign(row, updatePatch);
                return Promise.resolve({ data: rows[0] ?? null, error: null });
              },
            };
          },
          then(
            resolve: (v: { data: Row[]; error: null }) => unknown,
            reject?: (e: unknown) => unknown,
          ) {
            return applyUpdate().then(resolve, reject);
          },
        };
        return chain;
      },
      upsert(payload: Row, opts?: { onConflict?: string }) {
        const conflictCols = (opts?.onConflict ?? "").split(",").map((s) => s.trim());
        let existing: Row | undefined;
        if (conflictCols.length > 0 && conflictCols[0]) {
          existing = state[name].find((r) => conflictCols.every((c) => r[c] === payload[c]));
        }
        if (existing) {
          Object.assign(existing, payload);
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: existing, error: null });
                },
              };
            },
          };
        }
        const inserted = { ...payload, id: payload.id ?? crypto.randomUUID() };
        state[name].push(inserted);
        return {
          select() {
            return {
              single() {
                return Promise.resolve({ data: inserted, error: null });
              },
            };
          },
        };
      },
    };

    function filterRows(): Row[] {
      let rows = state[name].slice();
      for (const [col, val] of filters) rows = rows.filter((r) => r[col] === val);
      if (inFilter) rows = rows.filter((r) => inFilter![1].includes(r[inFilter![0]]));
      if (isFilter) {
        const [col, val] = isFilter;
        rows = rows.filter((r) => (val == null ? r[col] == null : r[col] === val));
      }
      if (gtFilter) {
        const [col, val] = gtFilter;
        rows = rows.filter((r) => Number(r[col]) > Number(val));
      }
      if (lteFilter) {
        const [col, val] = lteFilter;
        rows = rows.filter((r) => String(r[col]) <= String(val));
      }
      if (orderCol) {
        const col = orderCol;
        rows = rows.slice().sort((a, b) => {
          const av = a[col];
          const bv = b[col];
          if (av === bv) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return av < bv ? (orderAsc ? -1 : 1) : orderAsc ? 1 : -1;
        });
      }
      if (limitN != null) rows = rows.slice(0, limitN);
      return rows;
    }

    function exec() {
      const rows = filterRows();
      if (single) {
        if (rows.length === 1) return Promise.resolve({ data: rows[0], error: null });
        return Promise.resolve({ data: null, error: { message: "no single row" } });
      }
      if (maybeSingle) {
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      }
      return Promise.resolve({ data: rows, error: null });
    }

    q.then = (
      resolve: (v: { data: Row[] | Row | null; error: { message: string } | null }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => exec().then(resolve, reject);

    return q;
  }

  return {
    from: vi.fn((name: string) => tbl(name)),
    rpc: vi.fn(() => ({
      select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
    })),
    __state: state,
    __reset() {
      for (const k of Object.keys(state)) state[k] = [];
    },
  };
}
