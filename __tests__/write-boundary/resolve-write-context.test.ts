import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePilotSlotIdForConnection } from "@/lib/integrations/shared/resolve-write-context";

vi.mock("@/lib/integrations/accounting/resolve-company-id", () => ({
  resolveCompanyIdForUser: vi.fn(async () => null),
}));

type FirmClientRow = {
  id: string;
  company_id: string | null;
  firm_id: string | null;
  owner_user_id?: string;
};

type PilotSlotRow = {
  id: string;
  firm_id: string | null;
  company_id: string | null;
  updated_at?: string;
};

function createMockSupabase(seed: {
  firm_clients?: FirmClientRow[];
  pilot_slots?: PilotSlotRow[];
}): SupabaseClient {
  const firmClients = seed.firm_clients ?? [];
  const pilotSlots = seed.pilot_slots ?? [];

  function buildPilotQuery(filters: Record<string, unknown>) {
    const chain: Record<string, unknown> = {};
    const apply = () => {
      let rows = [...pilotSlots];
      for (const [key, value] of Object.entries(filters)) {
        if (key.endsWith("__null")) {
          const col = key.replace(/__null$/, "");
          rows = rows.filter((r) => (r as Record<string, unknown>)[col] == null);
        } else {
          rows = rows.filter((r) => (r as Record<string, unknown>)[key] === value);
        }
      }
      rows.sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
      return rows[0] ?? null;
    };

    chain.select = () => chain;
    chain.eq = (col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    };
    chain.is = (col: string, val: null) => {
      if (val === null) filters[`${col}__null`] = true;
      return chain;
    };
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.maybeSingle = async () => ({ data: apply(), error: null });
    return chain;
  }

  return {
    from: (table: string) => {
      if (table === "firm_clients") {
        const filters: Record<string, unknown> = {};
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.eq = (col: string, val: unknown) => {
          filters[col] = val;
          return chain;
        };
        chain.order = () => chain;
        chain.limit = () => chain;
        chain.maybeSingle = async () => {
          let rows = [...firmClients];
          for (const [key, value] of Object.entries(filters)) {
            rows = rows.filter((r) => (r as Record<string, unknown>)[key] === value);
          }
          return { data: rows[0] ?? null, error: null };
        };
        return chain;
      }
      if (table === "pilot_slots") {
        return buildPilotQuery({});
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
}

describe("resolvePilotSlotIdForConnection", () => {
  it("falls back to firm_id when company_id has no matching pilot_slot", async () => {
    const admin = createMockSupabase({
      firm_clients: [
        { id: "fc1", company_id: "company-X", firm_id: "firm-Y", owner_user_id: "user-Z" },
      ],
      pilot_slots: [
        // No slot for company-X, but a firm-Y slot with company_id=null
        { id: "slot-firm-Y", firm_id: "firm-Y", company_id: null, updated_at: "2026-01-01" },
      ],
    });
    const connection = { id: "conn-1", user_id: "user-Z", metadata_json: {} } as any;

    const slotId = await resolvePilotSlotIdForConnection(admin, connection, "fc1");
    expect(slotId).toBe("slot-firm-Y");
  });

  it("throws with both company_id and firm_id in error message when no slot found", async () => {
    const admin = createMockSupabase({
      firm_clients: [
        { id: "fc1", company_id: "company-X", firm_id: "firm-Y", owner_user_id: "user-Z" },
      ],
      pilot_slots: [],
    });
    const connection = { id: "conn-1", user_id: "user-Z", metadata_json: {} } as any;

    await expect(resolvePilotSlotIdForConnection(admin, connection, "fc1")).rejects.toThrow(
      /no pilot_slots for company company-X or firm firm-Y/,
    );
  });

  it("prefers company-scoped slot over firm fallback", async () => {
    const admin = createMockSupabase({
      firm_clients: [
        { id: "fc1", company_id: "company-X", firm_id: "firm-Y", owner_user_id: "user-Z" },
      ],
      pilot_slots: [
        { id: "slot-company-X", firm_id: null, company_id: "company-X", updated_at: "2026-02-01" },
        { id: "slot-firm-Y", firm_id: "firm-Y", company_id: null, updated_at: "2026-03-01" },
      ],
    });
    const connection = { id: "conn-1", user_id: "user-Z", metadata_json: {} } as any;

    const slotId = await resolvePilotSlotIdForConnection(admin, connection, "fc1");
    expect(slotId).toBe("slot-company-X");
  });
});
