import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateBackupPacket } = vi.hoisted(() => ({
  generateBackupPacket: vi.fn(),
}));

vi.mock("@/lib/je-evidence/packet-generator", () => ({ generateBackupPacket }));

import { dispatchBackupPacket } from "@/lib/je-evidence/dispatch-hook";

const db = {} as never;

describe("dispatchBackupPacket", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns void when generateBackupPacket rejects (no unhandled rejection)", async () => {
    generateBackupPacket.mockRejectedValue(new Error("pdf render failed"));
    dispatchBackupPacket(db, "attempt-1", "client-1");
    await new Promise((r) => setTimeout(r, 10));
    expect(generateBackupPacket).toHaveBeenCalledWith({
      db,
      attemptId: "attempt-1",
      firmClientId: "client-1",
    });
  });

  it("returns void when generateBackupPacket resolves null", async () => {
    generateBackupPacket.mockResolvedValue(null);
    dispatchBackupPacket(db, "attempt-2", "client-2");
    await new Promise((r) => setTimeout(r, 10));
    expect(generateBackupPacket).toHaveBeenCalledTimes(1);
  });

  it("returns void when generateBackupPacket resolves BackupPacketResult", async () => {
    generateBackupPacket.mockResolvedValue({
      packetId: "pkt-1",
      storagePath: "client-1/attempt-3/packet-abc.pdf",
      sha256: "abc123",
      byteSize: 4096,
    });
    dispatchBackupPacket(db, "attempt-3", "client-1");
    await new Promise((r) => setTimeout(r, 10));
    expect(generateBackupPacket).toHaveBeenCalledTimes(1);
  });
});
