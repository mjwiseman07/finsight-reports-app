// Shared hand-rolled Supabase mock for the D6.1/D6.2a runner tests.
// Not a test file (no `.test` suffix), so vitest ignores it as a suite.
//
// Supports the chains the runner uses:
//   loadClient:       from('firm_clients').select().eq().maybeSingle()
//   loadActiveRules:  from('curated_rules_registry').select().eq().in()[.in()]  (awaited)
//                     from('client_active_rules').select().eq().in()            (awaited)
//   writeFire:        from('curated_rule_fires').insert().select().maybeSingle()
//
// resolveQBOForClient uses getSupabaseAdmin() internally, so runner tests mock
// '@/lib/rules/runner/resolve-qbo' directly rather than routing through here.

export interface MockClientRow {
  id: string;
  company_id: string;
  industry_vertical: string;
  accounting_method: "cash" | "accrual" | "modified_cash";
  vertical_rules_enabled: boolean;
}

export interface MockActivationRow {
  rule_id: string;
  is_enabled: boolean;
  override_severity: string | null;
  disabled_at: string | null;
}

export type InsertResult = { data: { fire_id: string } | null; error: { code?: string } | null };

export interface MockOpts {
  client: MockClientRow | null;
  rules: Array<Record<string, unknown>>;
  /**
   * client_active_rules rows. If undefined, auto-enable every rule in `rules`
   * (is_enabled=true, disabled_at=null) so callers that only care about the
   * registry can stay terse. Pass an explicit array (even []) to control the
   * activation gate.
   */
  activations?: MockActivationRow[];
  clientError?: { message?: string } | null;
  rulesError?: { message?: string } | null;
  activationsError?: { message?: string } | null;
  /** Per-insert result override, indexed by insert call order. */
  insertResults?: InsertResult[];
}

export interface MockSupabase {
  from: (table: string) => unknown;
  readonly inserts: Array<Record<string, unknown>>;
  readonly loadActiveRulesCalled: () => boolean;
}

function autoActivations(rules: Array<Record<string, unknown>>): MockActivationRow[] {
  return rules.map((r) => ({
    rule_id: r.rule_id as string,
    is_enabled: true,
    override_severity: null,
    disabled_at: null,
  }));
}

export function makeSupabaseMock(opts: MockOpts): MockSupabase {
  const inserts: Array<Record<string, unknown>> = [];
  let insertCount = 0;
  let rulesQueried = false;
  const activations = opts.activations ?? autoActivations(opts.rules);

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
      // Mirror loadActiveRules Guardrail 2: only general + client vertical.
      const allowed = new Set(
        ["general", opts.client?.industry_vertical].filter(Boolean) as string[],
      );
      const filtered = opts.rules.filter((r) => allowed.has(r.vertical as string));
      return Promise.resolve({ data: filtered, error: opts.rulesError ?? null }).then(
        resolve,
        reject,
      );
    },
  };

  const activationsBuilder = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    in() {
      return this;
    },
    then<T>(
      resolve: (v: { data: unknown; error: unknown }) => T,
      reject?: (e: unknown) => T,
    ): Promise<T> {
      return Promise.resolve({ data: activations, error: opts.activationsError ?? null }).then(
        resolve,
        reject,
      );
    },
  };

  const supabase: MockSupabase = {
    from(table: string) {
      if (table === "firm_clients") return clientBuilder;
      if (table === "curated_rules_registry") return rulesBuilder;
      if (table === "client_active_rules") return activationsBuilder;
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
