import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetRailRegistryForTesting,
  getRail,
  listRegisteredRails,
} from "@/lib/ap-intake/payments/rail-registry";
import {
  _resetRailBootstrapForTesting,
  bootstrapRails,
} from "@/lib/ap-intake/payments/rails";

describe("rail registry", () => {
  beforeEach(() => {
    _resetRailRegistryForTesting();
    _resetRailBootstrapForTesting();
    bootstrapRails();
  });

  it("bootstrap registers all 5 rails", () => {
    const rails = listRegisteredRails().sort();
    expect(rails).toEqual(["ach", "check", "rtp", "virtual_card", "wire"]);
  });

  it("getRail returns the correct adapter per rail", () => {
    expect(getRail("ach").rail).toBe("ach");
    expect(getRail("wire").version).toBe("wire-adapter-v1.0.0");
    expect(getRail("rtp").rail).toBe("rtp");
    expect(getRail("check").rail).toBe("check");
    expect(getRail("virtual_card").rail).toBe("virtual_card");
  });

  it("getRail throws on unregistered rail", () => {
    _resetRailRegistryForTesting();
    expect(() => getRail("ach")).toThrow("no_rail_adapter_registered:ach");
  });

  it("adapter attempt/record return stable shape", async () => {
    const adapter = getRail("ach");
    const input = {
      batch_id: "b1",
      batch_line_id: "l1",
      firm_id: "f1",
      firm_client_id: "fc1",
      vendor_id: "v1",
      vendor_bank_account_id: "vba1",
      amount_cents: 5000,
      memo: null,
    };
    const attempt = await adapter.attempt(input);
    expect(attempt.outcome).toBe("pending");
    expect(attempt.adapter_version).toBe("ach-adapter-v1.0.0");
    expect(attempt.raw_adapter_payload).toHaveProperty("batch_line_id", "l1");

    const record = await adapter.record({
      ...input,
      external_reference: "ext-1",
      outcome: "confirmed",
    });
    expect(record.outcome).toBe("confirmed");
    expect(record.external_reference).toBe("ext-1");
    expect(record.adapter_version).toBe("ach-adapter-v1.0.0");
  });
});
