import { vi } from "vitest";

export interface MockResult {
  data: unknown;
  error: { message: string } | null;
}

export interface RecordedCall {
  table: string;
  ops: string[];
  args: unknown[][];
}

/**
 * Queue-based chainable Supabase mock. Each `.from(table)` call consumes the
 * next queued result for that table (FIFO). Terminal resolution happens via
 * `.single()`, `.maybeSingle()`, or by awaiting the builder directly (thenable).
 */
export function makeMockClient() {
  const results = new Map<string, MockResult[]>();
  const calls: RecordedCall[] = [];

  function queue(table: string, ...res: MockResult[]): void {
    const q = results.get(table) ?? [];
    q.push(...res);
    results.set(table, q);
  }

  function take(table: string): MockResult {
    const q = results.get(table);
    if (q && q.length) return q.shift() as MockResult;
    return { data: null, error: null };
  }

  function from(table: string) {
    const record: RecordedCall = { table, ops: [], args: [] };
    calls.push(record);

    const builder: Record<string, unknown> = {};
    const chain =
      (name: string) =>
      (...a: unknown[]) => {
        record.ops.push(name);
        record.args.push(a);
        return builder;
      };
    for (const m of [
      "select",
      "insert",
      "update",
      "upsert",
      "delete",
      "eq",
      "in",
      "gt",
      "gte",
      "lt",
      "lte",
      "order",
      "limit",
    ]) {
      builder[m] = vi.fn(chain(m));
    }
    builder.single = vi.fn(async () => take(table));
    builder.maybeSingle = vi.fn(async () => take(table));
    // Thenable: awaiting a chain that doesn't end in single() resolves the result.
    builder.then = (resolve: (v: MockResult) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(take(table)).then(resolve, reject);
    return builder;
  }

  const client = { from: vi.fn(from) };

  function callsFor(table: string): RecordedCall[] {
    return calls.filter((c) => c.table === table);
  }

  /** First args passed to a given op on a given table (e.g. insert row). */
  function firstArg(table: string, op: string): unknown {
    for (const c of calls) {
      if (c.table !== table) continue;
      const idx = c.ops.indexOf(op);
      if (idx >= 0) return c.args[idx]?.[0];
    }
    return undefined;
  }

  return { client, queue, calls, callsFor, firstArg };
}

export type MockClientHandle = ReturnType<typeof makeMockClient>;
