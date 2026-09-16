import { describe, it, expect, vi } from "vitest";
import {
  bootstrapCompanyForUser,
  CheckoutCompanyBootstrapError,
} from "@/lib/tcp1/create-session-company";
import {
  bootstrapCheckoutFirmWorkspace,
  CheckoutFirmBootstrapError,
} from "@/lib/tcp1/create-session-firm";

describe("bootstrapCompanyForUser", () => {
  it("returns existing company from atomic RPC", async () => {
    const admin = {
      rpc: vi.fn(async () => ({
        data: { ok: true, company_id: "company-existing", created: false },
        error: null,
      })),
    };
    const result = await bootstrapCompanyForUser({
      // @ts-expect-error — minimal mock
      admin,
      userId: "user-1",
      businessName: "Acme Books",
    });
    expect(result).toEqual({ companyId: "company-existing", created: false });
    expect(admin.rpc).toHaveBeenCalledWith("bootstrap_checkout_company_workspace", {
      p_buyer_user_id: "user-1",
      p_company_name: "Acme Books",
    });
  });

  it("maps RPC failures without DELETE compensation", async () => {
    const admin = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "bootstrap_checkout_missing_buyer", code: "22023" },
      })),
      from: vi.fn(),
    };
    await expect(
      bootstrapCompanyForUser({
        // @ts-expect-error — minimal mock
        admin,
        userId: "user-1",
        businessName: "Acme Books",
      }),
    ).rejects.toBeInstanceOf(CheckoutCompanyBootstrapError);
    expect(admin.from).not.toHaveBeenCalled();
  });
});

describe("bootstrapCheckoutFirmWorkspace", () => {
  it("returns firm + membership from atomic RPC", async () => {
    const admin = {
      rpc: vi.fn(async () => ({
        data: {
          ok: true,
          firm_id: "firm-1",
          membership_id: "mem-1",
          billing_company_id: null,
          created_firm: true,
          created_membership: true,
        },
        error: null,
      })),
    };
    const result = await bootstrapCheckoutFirmWorkspace({
      // @ts-expect-error — minimal mock
      admin,
      buyerUserId: "user-1",
      firmName: "Acme Firm",
    });
    expect(result.firmId).toBe("firm-1");
    expect(result.membershipId).toBe("mem-1");
    expect(result.createdFirm).toBe(true);
  });

  it("maps capacity lock busy to retryable bootstrap error", async () => {
    const admin = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "ra_pro_capacity_lock_busy", code: "55P03" },
      })),
    };
    await expect(
      bootstrapCheckoutFirmWorkspace({
        // @ts-expect-error — minimal mock
        admin,
        buyerUserId: "user-1",
        firmName: "Acme Firm",
      }),
    ).rejects.toMatchObject({
      code: "ra_pro_capacity_lock_busy",
      message: "workspace_bootstrap_retryable",
    });
  });

  it("maps isolation unsupported to retryable bootstrap error", async () => {
    const admin = {
      rpc: vi.fn(async () => ({
        data: null,
        error: {
          message: "ra_pro_capacity_isolation_unsupported",
          code: "0A000",
        },
      })),
    };
    await expect(
      bootstrapCheckoutFirmWorkspace({
        // @ts-expect-error — minimal mock
        admin,
        buyerUserId: "user-1",
        firmName: "Acme Firm",
        billingCompanyId: "co-1",
      }),
    ).rejects.toBeInstanceOf(CheckoutFirmBootstrapError);
  });
});
