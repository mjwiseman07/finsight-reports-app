import { describe, test, expect, vi } from "vitest";
import { maybeLearnEmailDomain } from "./customer-email-domain";

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn().mockResolvedValue({ eventId: "evt-1" }),
}));

describe("maybeLearnEmailDomain", () => {
  test("learns when email_domain is null", async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { email_domain: null }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            is: () => ({
              select: () => ({
                maybeSingle: async () => ({ data: { id: "cust-1" }, error: null }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await maybeLearnEmailDomain({
      supabase: mockClient as never,
      firm_id: "firm-1",
      company_id: "co-1",
      customer_id: "cust-1",
      observed_domain: "acmecorp.com",
      source_payment_id: "pay-1",
    });
    expect(result.learned).toBe(true);
  });

  test("does not overwrite existing domain", async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { email_domain: "existing.com" }, error: null }),
          }),
        }),
      }),
    };

    const result = await maybeLearnEmailDomain({
      supabase: mockClient as never,
      firm_id: "firm-1",
      company_id: "co-1",
      customer_id: "cust-1",
      observed_domain: "acmecorp.com",
      source_payment_id: "pay-1",
    });
    expect(result.learned).toBe(false);
    expect(result.existing).toBe("existing.com");
  });
});
