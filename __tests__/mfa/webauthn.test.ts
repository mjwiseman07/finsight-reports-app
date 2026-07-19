import { describe, it, expect } from "vitest";
import { signDeviceCookie, verifyDeviceCookie } from "@/lib/mfa/trusted-devices";

describe("trusted-device signing", () => {
  it("round-trips a device id", async () => {
    process.env.MFA_TRUSTED_DEVICE_SECRET = "a".repeat(32);
    const raw = await signDeviceCookie("device-abc-123");
    expect(await verifyDeviceCookie(raw)).toBe("device-abc-123");
  });

  it("rejects tampered signature", async () => {
    process.env.MFA_TRUSTED_DEVICE_SECRET = "a".repeat(32);
    const raw = await signDeviceCookie("device-abc-123");
    const tampered = raw.slice(0, -1) + "X";
    expect(await verifyDeviceCookie(tampered)).toBeNull();
  });

  it("rejects malformed cookie", async () => {
    process.env.MFA_TRUSTED_DEVICE_SECRET = "a".repeat(32);
    expect(await verifyDeviceCookie(undefined)).toBeNull();
    expect(await verifyDeviceCookie("no-dot")).toBeNull();
  });
});
