import { vi } from "vitest";

interface Row extends Record<string, unknown> {}

export function makeMockSupabase() {
  const state: Record<string, Row[]> = {
    engagement_addons: [],
    entitlement_check_audit: [],
    stripe_webhook_events: [],
    ledger_events: [],
    ai_action_log: [],
  };

  function tbl(name: string) {
    let filters: Array<[string, unknown]> = [];
    let limitN: number | undefined;
    let single = false;
    let maybeSingle = false;
    let inFilter: [string, unknown[]] | null = null;

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
          state[name].push({ ...r, id: r.id ?? crypto.randomUUID() });
        }
        return Promise.resolve({ data: rows, error: null });
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
  };
}
