import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the Supabase admin BEFORE importing the scheduler.
const mockClient = {
  from: vi.fn(),
};
vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => mockClient,
}));

// Mock the memory service.
const upsertMemory = vi.fn();
const reinforceMemory = vi.fn();
vi.mock("@/lib/memory/client-memory-service", () => ({
  upsertMemory: (...args: unknown[]) => upsertMemory(...args),
  reinforceMemory: (...args: unknown[]) => reinforceMemory(...args),
}));

import { fireDueTemplatesForClient } from "@/lib/recurring/scheduler";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOW = new Date("2026-07-15T10:00:00Z");

// NOTE (deviation from spec's paste): the spec's makeTemplateRow used
// `cadence_type`/`cadence_config` and omitted required columns (name, cadence,
// timezone, origin, post_count, skip_count, reject_count, start_date,
// created_at, updated_at). rowToRecurringTemplate (db-mapper.ts, frozen) throws
// `d5.mapper.missing_field:*` on those, which fireOneTemplate catches — so
// fires_created would stay 0 and every assertion would fail. This fixture uses
// the real recurring_templates column names so the branch is actually exercised.
function makeTemplateRow(overrides: Record<string, unknown> = {}) {
  return {
    template_id: TEMPLATE_ID,
    firm_client_id: FIRM_CLIENT_ID,
    name: "D5.6 cash-basis test template",
    description: null,
    template_type: "fixed",
    je_payload_template: {
      Line: [
        { Amount: 100, JournalEntryLineDetail: { PostingType: "Debit" } },
        { Amount: 100, JournalEntryLineDetail: { PostingType: "Credit" } },
      ],
    },
    cadence: "monthly",
    custom_days: null,
    day_of_month: 15,
    day_of_week: null,
    month_of_year: null,
    timezone: "America/New_York",
    starting_balance: null,
    total_periods: null,
    periods_elapsed: 0,
    start_date: "2026-01-01",
    end_date: null,
    next_fire_date: "2026-07-15",
    last_fired_at: null,
    status: "active",
    auto_post: false,
    origin: "user",
    origin_memory_id: null,
    fire_count: 0,
    post_count: 0,
    skip_count: 0,
    reject_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by_user_id: null,
    ended_by_user_id: null,
    ended_at: null,
    ...overrides,
  };
}

function stubSupabaseChain(client: { accounting_method: string | null }, templateRows: unknown[]) {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  mockClient.from.mockImplementation((table: string) => {
    if (table === "firm_clients") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: FIRM_CLIENT_ID, timezone: "America/New_York", ...client },
                error: null,
              }),
          }),
        }),
      };
    }
    if (table === "recurring_templates") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              lte: () => Promise.resolve({ data: templateRows, error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => Promise.resolve({ data: [{ template_id: TEMPLATE_ID }], error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "recurring_fires") {
      return { insert: insertMock };
    }
    return {};
  });
  return { insertMock };
}

describe("D5.6 — scheduler cash-basis branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMemory.mockResolvedValue({ memory_id: `mem_cash_basis_client_${FIRM_CLIENT_ID}`, created: true });
    reinforceMemory.mockResolvedValue(undefined);
  });

  it("accrual client → status='proposed' (baseline unchanged)", async () => {
    const { insertMock } = stubSupabaseChain({ accounting_method: "accrual" }, [makeTemplateRow()]);
    const summary = await fireDueTemplatesForClient(FIRM_CLIENT_ID, NOW);
    expect(summary.fires_created).toBe(1);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ status: "proposed" }));
    expect(upsertMemory).not.toHaveBeenCalled();
    expect(reinforceMemory).not.toHaveBeenCalled();
  });

  it("cash client → status='cash_basis', amount_override=null", async () => {
    const { insertMock } = stubSupabaseChain({ accounting_method: "cash" }, [makeTemplateRow()]);
    const summary = await fireDueTemplatesForClient(FIRM_CLIENT_ID, NOW);
    expect(summary.fires_created).toBe(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cash_basis", amount_override: null }),
    );
  });

  it("cash client → upsertMemory called with deterministic memoryId", async () => {
    stubSupabaseChain({ accounting_method: "cash" }, [makeTemplateRow()]);
    await fireDueTemplatesForClient(FIRM_CLIENT_ID, NOW);
    expect(upsertMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        firmClientId: FIRM_CLIENT_ID,
        memoryId: `mem_cash_basis_client_${FIRM_CLIENT_ID}`,
        memoryType: "operational_note",
      }),
    );
  });

  it("cash client + existing memory → reinforceMemory('success')", async () => {
    upsertMemory.mockResolvedValue({ memory_id: `mem_cash_basis_client_${FIRM_CLIENT_ID}`, created: false });
    stubSupabaseChain({ accounting_method: "cash" }, [makeTemplateRow()]);
    await fireDueTemplatesForClient(FIRM_CLIENT_ID, NOW);
    expect(reinforceMemory).toHaveBeenCalledWith(`mem_cash_basis_client_${FIRM_CLIENT_ID}`, "success");
  });

  it("cash client + memory error → fire still lands, error in summary", async () => {
    upsertMemory.mockRejectedValue(new Error("memory service down"));
    stubSupabaseChain({ accounting_method: "cash" }, [makeTemplateRow()]);
    const summary = await fireDueTemplatesForClient(FIRM_CLIENT_ID, NOW);
    expect(summary.fires_created).toBe(1);
    expect(summary.errors.some((e) => e.error.startsWith("memory_reinforce_failed:"))).toBe(true);
  });
});
