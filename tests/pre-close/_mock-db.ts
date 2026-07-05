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

const UPSERT_CONFLICT_KEYS: Record<string, string[]> = {
  close_assertion_coverage: [
    "firm_client_id",
    "close_period_id",
    "account_category",
    "assertion_id",
  ],
  close_gap_review_items: [
    "firm_client_id",
    "close_period_id",
    "account_category",
    "assertion_id",
  ],
  manual_test_evidence: [
    "firm_client_id",
    "close_period_id",
    "account_category",
    "assertion_id",
    "content_hash",
  ],
  manual_test_attachments: ["evidence_id", "sha256"],
};

const COMPOSITE_UNIQUE_KEYS: Record<string, string[]> = {
  assertion_coverage_statement_versions: ["close_packet_id", "packet_version"],
};

function pickCols(row: Row | undefined, cols: string): Row | null {
  if (!row) return null;
  if (cols === "*") return row;
  const out: Row = {};
  for (const c of cols.split(",").map((s) => s.trim())) {
    if (c in row) out[c] = row[c];
  }
  return out;
}

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
    engagement_posting_policy: [],
    close_periods: [],
    assertion_relevance_matrix: [],
    rule_assertion_coverage: [],
    advisacor_flags: [],
    close_assertion_coverage: [],
    close_assertion_coverage_events: [],
    assertion_gap_root_causes: [],
    close_gap_review_items: [],
    manual_test_evidence: [],
    manual_test_attachments: [],
    firm_memberships: [],
    assertion_coverage_statement_versions: [],
    assertion_coverage_statement_downloads: [],
    assertions_catalog: [],
    je_post_attempts: [],
    je_posting_audit: [],
  };

  function ensure(name: string): Row[] {
    if (!state[name]) state[name] = [];
    return state[name];
  }

  function applyFkEmbeds(tableName: string, rows: Row[], selectCols: string): Row[] {
    const re = /(\w+)\(([^)]+)\)/g;
    const embeds: Array<{ table: string; cols: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(selectCols)) !== null) {
      if (m[1].includes("!inner")) continue;
      embeds.push({ table: m[1], cols: m[2] });
    }
    if (embeds.length === 0) return rows;
    return rows.map((row) => {
      let out: Row = { ...row };
      for (const emb of embeds) {
        let related: Row | undefined;
        if (emb.table === "firm_clients") {
          related = ensure("firm_clients").find((fc) => fc.id === out.firm_client_id);
        } else if (emb.table === "engagements") {
          related = ensure("engagements").find((e) => e.id === out.engagement_id);
        }
        if (related) out = { ...out, [emb.table]: pickCols(related, emb.cols) };
      }
      return out;
    });
  }

  function applyInnerJoins(tableName: string, rows: Row[], selectCols: string): Row[] {
    if (!selectCols.includes("!inner")) return rows;
    return rows.flatMap((row) => {
      let out: Row = { ...row };
      let matched = true;
      const re = /(\w+)!inner\(([^)]+)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(selectCols)) !== null) {
        const relTable = m[1];
        const relCols = m[2];
        let related: Row | undefined;
        if (tableName === "pre_close_review_items" && relTable === "curated_rule_fires") {
          related = ensure(relTable).find(
            (f) => f.fire_id === out.fire_id || f.id === out.fire_id,
          );
        } else if (tableName === "close_periods" && relTable === "firm_clients") {
          related = ensure(relTable).find((fc) => fc.id === out.firm_client_id);
        }
        if (!related) {
          matched = false;
          break;
        }
        out = { ...out, [relTable]: pickCols(related, relCols) };
      }
      return matched ? [out] : [];
    });
  }

  function matches(
    row: Row,
    eqFilters: Array<[string, unknown]>,
    containsFilters: Array<[string, Record<string, unknown>]>,
    neqFilters: Array<[string, unknown]>,
    isFilters: Array<[string, unknown]>,
    inFilters: Array<[string, unknown[]]>,
    lteFilters: Array<[string, unknown]>,
    gteFilters: Array<[string, unknown]>,
  ): boolean {
    for (const [c, v] of eqFilters) if (row[c] !== v) return false;
    for (const [c, want] of containsFilters) {
      const got = (row[c] as Record<string, unknown>) ?? {};
      for (const [k, wv] of Object.entries(want)) {
        if (got[k] !== wv) return false;
      }
    }
    for (const [c, v] of neqFilters) if (row[c] === v) return false;
    for (const [c, v] of isFilters) {
      if (v === null && row[c] != null) return false;
      if (v !== null && row[c] !== v) return false;
    }
    for (const [c, vals] of inFilters) {
      if (!vals.includes(row[c])) return false;
    }
    for (const [c, v] of lteFilters) {
      if (typeof row[c] === "string" && typeof v === "string" && row[c] > v) return false;
    }
    for (const [c, v] of gteFilters) {
      if (typeof row[c] === "string" && typeof v === "string" && row[c] < v) return false;
    }
    return true;
  }

  function tbl(name: string) {
    const eqFilters: Array<[string, unknown]> = [];
    const containsFilters: Array<[string, Record<string, unknown>]> = [];
    const neqFilters: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];
    const inFilters: Array<[string, unknown[]]> = [];
    const lteFilters: Array<[string, unknown]> = [];
    const gteFilters: Array<[string, unknown]> = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitN: number | undefined;
    let selectCols = "*";
    let headOnly = false;

    function selected(): Row[] {
      let rows = ensure(name).filter((r) =>
        matches(r, eqFilters, containsFilters, neqFilters, isFilters, inFilters, lteFilters, gteFilters),
      );
      rows = applyInnerJoins(name, rows, selectCols);
      rows = applyFkEmbeds(name, rows, selectCols);
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
      select(cols = "*", opts?: { count?: string; head?: boolean }) {
        selectCols = cols;
        headOnly = !!opts?.head;
        return selectChain;
      },
      eq(col: string, val: unknown) {
        eqFilters.push([col, val]);
        return selectChain;
      },
      neq(col: string, val: unknown) {
        neqFilters.push([col, val]);
        return selectChain;
      },
      is(col: string, val: unknown) {
        isFilters.push([col, val]);
        return selectChain;
      },
      in(col: string, vals: unknown[]) {
        inFilters.push([col, vals]);
        return selectChain;
      },
      lte(col: string, val: unknown) {
        lteFilters.push([col, val]);
        return selectChain;
      },
      gte(col: string, val: unknown) {
        gteFilters.push([col, val]);
        return selectChain;
      },
      or(_expr: string) {
        return selectChain;
      },
      like(col: string, pattern: string) {
        eqFilters.push([col, pattern.replace(/%/g, "")]);
        return selectChain;
      },
      contains(col: string, val: Record<string, unknown>) {
        containsFilters.push([col, val]);
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
        if (headOnly) {
          const rows = selected();
          return Promise.resolve({ data: null, error: null, count: rows.length });
        }
        const rows = selected();
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      single() {
        if (headOnly) {
          const rows = selected();
          return Promise.resolve({ data: null, error: null, count: rows.length });
        }
        const rows = selected();
        if (rows.length === 1) return Promise.resolve({ data: rows[0], error: null });
        return Promise.resolve({ data: null, error: { message: "no single row" } });
      },
      then(resolve: (v: { data: Row[] | null; error: null; count?: number }) => unknown, reject?: (e: unknown) => unknown) {
        const rows = selected();
        if (headOnly) {
          return Promise.resolve({ data: null, error: null, count: rows.length }).then(resolve, reject);
        }
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve, reject);
      },
    };

    function doInsert(payload: Row | Row[]) {
      const rows = Array.isArray(payload) ? payload : [payload];
      const uniqueKey = UNIQUE_KEYS[name];
      const compositeKey = COMPOSITE_UNIQUE_KEYS[name];
      const inserted: Row[] = [];
      for (const r of rows) {
        if (uniqueKey && ensure(name).some((x) => x[uniqueKey] === r[uniqueKey])) {
          return { error: { code: "23505", message: `duplicate key value violates unique constraint (${uniqueKey})` }, inserted: null };
        }
        if (compositeKey?.length && ensure(name).some((x) => compositeKey.every((c) => x[c] === r[c]))) {
          return { error: { code: "23505", message: `duplicate key value violates unique constraint (${compositeKey.join(",")})` }, inserted: null };
        }
        const row: Row = {
          id: r.id ?? randomUUID(),
          snapshot_id: r.snapshot_id ?? randomUUID(),
          download_id: r.download_id ?? randomUUID(),
          created_at: r.created_at ?? new Date().toISOString(),
          decision: r.decision ?? null,
          decision_reason_code: r.decision_reason_code ?? null,
          decision_reason_text: r.decision_reason_text ?? null,
          reviewer_user_id: r.reviewer_user_id ?? null,
          decision_at: r.decision_at ?? null,
          edited_je_draft: r.edited_je_draft ?? null,
          posted_je_attempt_id: r.posted_je_attempt_id ?? null,
          post_block_reason: r.post_block_reason ?? null,
          assertion_tags: r.assertion_tags ?? [],
          resolution_status: r.resolution_status ?? "open",
          resolution_type: r.resolution_type ?? null,
          resolution_metadata: r.resolution_metadata ?? {},
          gap_root_cause_code: r.gap_root_cause_code ?? "no_rule_defined",
          relevance_at_detection: r.relevance_at_detection ?? "relevant",
          severity: r.severity ?? "warning",
          first_detected_at: r.first_detected_at ?? new Date().toISOString(),
          last_projected_at: r.last_projected_at ?? new Date().toISOString(),
          updated_at: r.updated_at ?? new Date().toISOString(),
          assertions_addressed: r.assertions_addressed ?? [],
          attempt_id: r.attempt_id ?? randomUUID(),
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
        const rows = ensure(name).filter((r) => matches(r, upEq, [], [], upIs, [], [], []));
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

    const upsert = (payload: Row | Row[], opts?: { onConflict?: string }) => {
      const rows = Array.isArray(payload) ? payload : [payload];
      const conflictCols =
        opts?.onConflict?.split(",").map((s) => s.trim()) ?? UPSERT_CONFLICT_KEYS[name];
      const inserted: Row[] = [];
      for (const r of rows) {
        let existing: Row | undefined;
        if (conflictCols?.length) {
          existing = ensure(name).find((x) =>
            conflictCols.every((c) => x[c] === r[c]),
          );
        }
        if (existing) {
          Object.assign(existing, r, { updated_at: r.updated_at ?? new Date().toISOString() });
          inserted.push(existing);
        } else {
          const result = doInsert(r);
          if (result.error) {
            return {
              then(resolve: (v: { data: Row[] | null; error: unknown }) => unknown) {
                return Promise.resolve({ data: null, error: result.error }).then(resolve);
              },
            };
          }
          inserted.push(result.inserted![0]);
        }
      }
      const upsertChain: Record<string, unknown> = {
        select() {
          return {
            single() {
              return Promise.resolve({ data: inserted[0] ?? null, error: null });
            },
            maybeSingle() {
              return Promise.resolve({ data: inserted[0] ?? null, error: null });
            },
          };
        },
        then(resolve: (v: { data: Row[] | null; error: unknown }) => unknown) {
          return Promise.resolve({ data: inserted, error: null }).then(resolve);
        },
      };
      return upsertChain;
    };

    return { ...selectChain, insert, update, upsert };
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
