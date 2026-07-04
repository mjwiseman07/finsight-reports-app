import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeReviewerMockDb } from "../reviewer/_mock-service";

const mock = makeReviewerMockDb();
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));

import { generateBackupPacket } from "@/lib/je-evidence/packet-generator";

beforeEach(() => mock.__reset());

describe("packet-generator integration", () => {
  it("happy path inserts je_backup_packets row", async () => {
    mock.__seed("je_posting_audit", [
      {
        attempt_id: "att1",
        firm_client_id: "fc1",
        status: "posted",
        payload_json: { lines: [] },
        qbo_je_id: "q1",
      },
    ]);
    mock.__seed("je_line_evidence", [
      { evidence_id: "ev1", attempt_id: "att1", line_index: 0, evidence_summary: "sum" },
    ]);
    const result = await generateBackupPacket({ db: mock as never, attemptId: "att1", firmClientId: "fc1" });
    expect(result).not.toBeNull();
    expect(result!.packetId).toBeTruthy();
    expect(mock.__state.je_backup_packets.length).toBe(1);
  });

  it("idempotent second call returns existing", async () => {
    mock.__seed("je_backup_packets", [
      {
        packet_id: "p1",
        attempt_id: "att1",
        storage_path: "fc1/att1/packet-abc.pdf",
        sha256: "abc",
        byte_size: 100,
        generation_status: "generated",
      },
    ]);
    const result = await generateBackupPacket({ db: mock as never, attemptId: "att1", firmClientId: "fc1" });
    expect(result?.packetId).toBe("p1");
    expect(mock.__state.je_backup_packets.length).toBe(1);
  });

  it("missing audit returns null", async () => {
    const result = await generateBackupPacket({ db: mock as never, attemptId: "missing", firmClientId: "fc1" });
    expect(result).toBeNull();
  });

  it("no line evidence still generates", async () => {
    mock.__seed("je_posting_audit", [
      { attempt_id: "att2", firm_client_id: "fc1", status: "posted", payload_json: {} },
    ]);
    const result = await generateBackupPacket({ db: mock as never, attemptId: "att2", firmClientId: "fc1" });
    expect(result).not.toBeNull();
  });

  it("signed URLs included when attachments exist", async () => {
    mock.__seed("je_posting_audit", [
      { attempt_id: "att3", firm_client_id: "fc1", status: "posted", payload_json: {} },
    ]);
    mock.__seed("je_line_attachments", [
      {
        attachment_id: "a1",
        attempt_id: "att3",
        storage_path: "path/doc.pdf",
        original_filename: "doc.pdf",
      },
    ]);
    const result = await generateBackupPacket({ db: mock as never, attemptId: "att3", firmClientId: "fc1" });
    expect(result).not.toBeNull();
    expect(mock.storage.from).toHaveBeenCalled();
  });
});
