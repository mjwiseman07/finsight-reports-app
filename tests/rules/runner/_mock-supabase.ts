// Shared hand-rolled Supabase mock for the D6.1 runner tests.
// Not a test file (no `.test` suffix), so vitest ignores it as a suite.
//
// Supports the exact chains the runner uses:
//   loadClient:       from('firm_clients').select().eq().maybeSingle()
//   loadActiveRules:  from('curated_rules_registry').select().eq().in()[.in()]  (awaited)
//   writeFire:        from('curated_rule_fires').insert().select().maybeSingle()

export interface MockClientRow {
  id: string;
  industry_vertical: string;
  accounting_method: "cash" | "accrual" | "modified_cash";
  vertical_rules_enabled: boolean;
}

export type InsertResult = { data: { fire_id: string } | null; error: { code?: string } | null };

export interface MockOpts {
  client: MockClientRow | null;
  rules: Array<Record<string, unknown>>;
  clientError?: { message?: string } | null;
  rulesError?: { message?: string } | null;
  /** Per-insert result override, indexed by insert call order. */
  insertResults?: InsertResult[];
}

export interface MockSupabase {
  from: (table: string) => unknown;
  readonly inserts: Array<Record<string, unknown>>;
  readonly loadActiveRulesCalled: () => boolean;
}

export function makeSupabaseMock(opts: MockOpts): MockSupabase {
  const inserts: Array<Record<string, unknown>> = [];
  let insertCount = 0;
  let rulesQueried = false;

  const clientBuilder = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: opts.client, error: opts.clientError ?? null };
    },
  };

  const rulesBuilder = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    in() {
      rulesQueried = true;
      return this;
    },
    then<T>(
      resolve: (v: { data: unknown; error: unknown }) => T,
      reject?: (e: unknown) => T,
    ): Promise<T> {
      return Promise.resolve({
        data: opts.rules,
        error: opts.rulesError ?? null,
      }).then(resolve, reject);
    },
  };

  const supabase: MockSupabase = {
    from(table: string) {
      if (table === "firm_clients") return clientBuilder;
      if (table === "curated_rules_registry") return rulesBuilder;
      if (table === "curated_rule_fires") {
        return {
          insert(row: Record<string, unknown>) {
            inserts.push(row);
            const idx = insertCount++;
            const override = opts.insertResults?.[idx];
            const res: InsertResult =
              override ?? { data: { fire_id: `fire-${idx + 1}` }, error: null };
            return {
              select() {
                return {
                  async maybeSingle() {
                    return res;
                  },
                };
              },
            };
          },
        };
      }
      return {};
    },
    get inserts() {
      return inserts;
    },
    loadActiveRulesCalled: () => rulesQueried,
  };

  return supabase;
}
