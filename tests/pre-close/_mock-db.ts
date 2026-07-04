/**
 * D6.4c-1 — Shared in-memory Supabase mock for pre-close / directive / composer
 * / engagement-resolution tests.
 *
 * Supports the query surface those modules actually use:
 *   - select().eq().eq()...order().maybeSingle()/single()/thenable
 *   - insert(payload).select("*").single()  (with unique-index enforcement)
 *   - insert(payload)  (thenable)
 *   - update(patch).eq().is().select("*").maybeSingle()
 *   - update(patch).eq().is()  (thenable)
 *
 * Not a general Postgres emulator — only the shapes these modules exercise.
 */
import { vi } from "vitest";
import { randomUUID } from "node:crypto";

type Row = Record<string, unknown>;

export interface MockDb {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  __state: Record<string, Row[]>;
  __seed: (table: string, rows: Row[]) => void;
  __reset: () => void;
}

// Tables with a single-column unique index enforced on insert.
const UNIQUE_KEYS: Record<string, string> = {
  pre_close_review_items: "fire_id",
};

export function makeMockDb(): MockDb {
  const state: Record<string, Row[]> = {
    portcos: [],
    firm_clients: [],
    engagements: [],
    curated_rules_registry: [],
    curated_rule_fires: [],
    pre_close_review_items: [],
    ai_action_log: [],
    engagement_addons: [],
    entitlement_check_audit: [],
    ledger_events: [],
  };

  function ensure(name: string): Row[] {
    if (!state[name]) state[name] = [];
    return state[name];
  }

  function matches(row: Row, eqFilters: Array<[string, unknown]>, isFilters: Array<[string, unknown]>): boolean {
    for (const [c, v] of eqFilters) if (row[c] !== v) return false;
    for (const [c, v] of isFilters) {
      if (v === null && row[c] != null) return false;
      if (v !== null && row[c] !== v) return false;
    }
    return true;
  }

  function tbl(name: string) {
    const eqFilters: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitN: number | undefined;

    function selected(): Row[] {
      let rows = ensure(name).filter((r) => matches(r, eqFilters, isFilters));
      if (orderCol) {
        const col = orderCol;
        rows = rows.slice().sort((a, b) => {
          const av = a[col] as string | number;
          const bv = b[col] as string | number;
          if (av < bv) return orderAsc ? -1 : 1;
          if (av > bv) return orderAsc ? 1 : -1;
          return 0;
        });
      }
      if (limitN != null) rows = rows.slice(0, limitN);
      return rows;
    }

    // --- SELECT chain ---
    const selectChain: Record<string, unknown> = {
      select() {
        return selectChain;
      },
      eq(col: string, val: unknown) {
        eqFilters.push([col, val]);
        return selectChain;
      },
      is(col: string, val: unknown) {
        isFilters.push([col, val]);
        return selectChain;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = opts?.ascending !== false;
        return selectChain;
      },
      limit(n: number) {
        limitN = n;
        return selectChain;
      },
      maybeSingle() {
        const rows = selected();
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      single() {
        const rows = selected();
        if (rows.length === 1) return Promise.resolve({ data: rows[0], error: null });
        return Promise.resolve({ data: null, error: { message: "no single row" } });
      },
      then(resolve: (v: { data: Row[]; error: null }) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve({ data: selected(), error: null }).then(resolve, reject);
      },
    };

    function doInsert(payload: Row | Row[]) {
      const rows = Array.isArray(payload) ? payload : [payload];
      const uniqueKey = UNIQUE_KEYS[name];
      const inserted: Row[] = [];
      for (const r of rows) {
        if (uniqueKey && ensure(name).some((x) => x[uniqueKey] === r[uniqueKey])) {
          return { error: { code: "23505", message: `duplicate key value violates unique constraint (${uniqueKey})` }, inserted: null };
        }
        const row: Row = {
          id: r.id ?? randomUUID(),
          created_at: r.created_at ?? new Date().toISOString(),
          decision: r.decision ?? null,
          decision_reason_code: r.decision_reason_code ?? null,
          decision_reason_text: r.decision_reason_text ?? null,
          reviewer_user_id: r.reviewer_user_id ?? null,
          decision_at: r.decision_at ?? null,
          edited_je_draft: r.edited_je_draft ?? null,
          posted_je_attempt_id: r.posted_je_attempt_id ?? null,
          ...r,
        };
        ensure(name).push(row);
        inserted.push(row);
      }
      return { error: null, inserted };
    }

    const insert = (payload: Row | Row[]) => {
      const result = doInsert(payload);
      const chain: Record<string, unknown> = {
        select() {
          return {
            single() {
              if (result.error) return Promise.resolve({ data: null, error: result.error });
              return Promise.resolve({ data: result.inserted![0] ?? null, error: null });
            },
            maybeSingle() {
              if (result.error) return Promise.resolve({ data: null, error: result.error });
              return Promise.resolve({ data: result.inserted![0] ?? null, error: null });
            },
          };
        },
        then(resolve: (v: { data: Row[] | null; error: unknown }) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve(
            result.error
              ? { data: null, error: result.error }
              : { data: result.inserted, error: null },
          ).then(resolve, reject);
        },
      };
      return chain;
    };

    const update = (patch: Row) => {
      const upEq: Array<[string, unknown]> = [];
      const upIs: Array<[string, unknown]> = [];
      const applyUpdate = () => {
        const rows = ensure(name).filter((r) => matches(r, upEq, upIs));
        for (const row of rows) Object.assign(row, patch);
        return rows;
      };
      const chain: Record<string, unknown> = {
        eq(col: string, val: unknown) {
          upEq.push([col, val]);
          return chain;
        },
        is(col: string, val: unknown) {
          upIs.push([col, val]);
          return chain;
        },
        select() {
          return {
            maybeSingle() {
              const rows = applyUpdate();
              return Promise.resolve({ data: rows[0] ?? null, error: null });
            },
            single() {
              const rows = applyUpdate();
              return Promise.resolve({ data: rows[0] ?? null, error: null });
            },
          };
        },
        then(resolve: (v: { data: Row[]; error: null }) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve({ data: applyUpdate(), error: null }).then(resolve, reject);
        },
      };
      return chain;
    };

    return { ...selectChain, insert, update };
  }

  return {
    from: vi.fn((name: string) => tbl(name)),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    __state: state,
    __seed: (table: string, rows: Row[]) => {
      ensure(table).push(...rows);
    },
    __reset: () => {
      for (const k of Object.keys(state)) state[k] = [];
    },
  };
}
