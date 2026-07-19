import { describe, it, expect } from "vitest";
import { trustedDeviceCookieName } from "@/lib/mfa/trusted-devices";

describe("trusted device cookie name", () => {
  it("is namespaced", () => {
    expect(trustedDeviceCookieName()).toBe("advisacor_mfa_device_id");
  });
});
