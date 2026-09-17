import { describe, expect, it, vi } from "vitest";
import {
  currentMonthToDate,
  runRaProHourlyAccountingRefresh,
  selectEligibleRaProConnections,
  type ConnectedAccountingGrant,
} from "@/lib/accounting-automation/hourly-refresh";

const qbo: ConnectedAccountingGrant = {
  id: "qbo-connection",
  user_id: "user-1",
  provider: "quickbooks",
  tenant_or_realm_id: "realm-1",
  external_entity_id: null,
};
const xero: ConnectedAccountingGrant = {
  id: "xero-connection",
  user_id: "user-2",
  provider: "xero",
  tenant_or_realm_id: "tenant-2",
  external_entity_id: null,
};

describe("RA Pro hourly accounting refresh", () => {
  it("selects only connected tenants beneath linked authorizing RA Pro firms", () => {
    const selected = selectEligibleRaProConnections({
      firms: [
        { id: "firm-1", billing_company_id: "billing-1" },
        { id: "firm-unlinked", billing_company_id: null },
        { id: "firm-cancelled", billing_company_id: "billing-2" },
      ],
      slots: [
        { company_id: "billing-1", pilot_status: "active" },
        { company_id: "billing-2", pilot_status: "cancelled" },
      ],
      firmClients: [
        { firm_id: "firm-1", company_id: "client-qbo" },
        { firm_id: "firm-1", company_id: "client-xero" },
        { firm_id: "firm-unlinked", company_id: "client-unlinked" },
        { firm_id: "firm-cancelled", company_id: "client-cancelled" },
      ],
      companies: [
        { id: "client-qbo", qbo_realm_id: "realm-1", xero_tenant_id: null },
        { id: "client-xero", qbo_realm_id: null, xero_tenant_id: "tenant-2" },
        { id: "client-unlinked", qbo_realm_id: "realm-3", xero_tenant_id: null },
        { id: "client-cancelled", qbo_realm_id: "realm-4", xero_tenant_id: null },
      ],
      connections: [
        qbo,
        xero,
        { ...qbo, id: "unlinked", tenant_or_realm_id: "realm-3" },
        { ...qbo, id: "cancelled", tenant_or_realm_id: "realm-4" },
      ],
    });

    expect(selected.map((connection) => connection.id)).toEqual([
      "qbo-connection",
      "xero-connection",
    ]);
  });

  it("uses a UTC month-to-date reporting window", () => {
    expect(currentMonthToDate(new Date("2026-09-17T23:45:00Z"))).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-17",
    });
  });

  it("refreshes QBO and Xero independently and sanitizes failures", async () => {
    const refresh = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("OAuth token expired: secret detail"));

    const summary = await runRaProHourlyAccountingRefresh({
      now: new Date("2026-09-17T12:00:00Z"),
      loadConnections: async () => [qbo, xero],
      refresh: refresh as never,
    });

    expect(refresh).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        connectionId: "qbo-connection",
        sourceSystem: "quickbooks",
        dateRange: { startDate: "2026-09-01", endDate: "2026-09-17" },
      }),
    );
    expect(summary).toMatchObject({
      status: "partial",
      eligible_connections: 2,
      attempted: 2,
      succeeded: 1,
      failed: 1,
      failures: [
        {
          connection_id: "xero-connection",
          provider: "xero",
          code: "provider_credentials_unavailable",
        },
      ],
    });
    expect(JSON.stringify(summary)).not.toContain("secret detail");
  });
});

