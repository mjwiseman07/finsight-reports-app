import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  makeReviewerMockDb,
  seedClient,
  seedEngagement,
  seedFirmUser,
} from "../../reviewer/_mock-service";

const mock = makeReviewerMockDb();
const attachMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));
vi.mock("@/lib/assertions/manual-test-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/assertions/manual-test-service")>();
  return {
    ...actual,
    attachFileToManualTest: attachMock,
  };
});

import { POST } from "@/app/api/reviewer/manual-tests/[id]/attachments/route";
import { GET } from "@/app/api/reviewer/manual-tests/[id]/route";

beforeEach(() => {
  mock.__reset();
  attachMock.mockReset();
  attachMock.mockResolvedValue({
    attachmentId: "att1",
    evidenceId: "mt1",
    sha256: "abc",
    originalFilename: "stmt.pdf",
  });
});

describe("POST /api/reviewer/manual-tests/[id]/attachments", () => {
  it("404 when evidence missing", async () => {
    seedFirmUser(mock, "u1", "f1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/manual-tests/x/attachments", {
        method: "POST",
        headers: { authorization: "Bearer t" },
      }),
      { params: Promise.resolve({ id: "x" }) },
    );
    expect(res.status).toBe(404);
  });

  it("403 reader cannot upload", async () => {
    seedFirmUser(mock, "u1", "f1", "readonly");
    seedEngagement(mock, "e1", "f1");
    mock.__seed("manual_test_evidence", [
      { id: "mt1", firm_client_id: "fc1", engagement_id: "e1" },
    ]);
    const fd = new FormData();
    fd.append("file", new File(["bytes"], "stmt.pdf", { type: "application/pdf" }));
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/manual-tests/mt1/attachments", {
        method: "POST",
        headers: { authorization: "Bearer t" },
        body: fd,
      }),
      { params: Promise.resolve({ id: "mt1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("deduplicates same sha256", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    mock.__seed("manual_test_evidence", [
      { id: "mt1", firm_client_id: "fc1", engagement_id: "e1" },
    ]);
    mock.__seed("manual_test_attachments", [
      {
        attachment_id: "att-existing",
        evidence_id: "mt1",
        sha256: "277089d91c0bdf4f2e6862ba7e4a07605119431f5d13f726dd352b06f1b206a9",
        storage_path: "fc1/mt1/x.pdf",
        original_filename: "stmt.pdf",
        byte_size: 5,
        mime_type: "application/pdf",
      },
    ]);
    const fd = new FormData();
    fd.append("file", new File(["bytes"], "stmt.pdf", { type: "application/pdf" }));
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/manual-tests/mt1/attachments", {
        method: "POST",
        headers: { authorization: "Bearer t" },
        body: fd,
      }),
      { params: Promise.resolve({ id: "mt1" }) },
    );
    const body = await res.json();
    expect(body.deduplicated).toBe(true);
    expect(attachMock).not.toHaveBeenCalled();
  });

  it("uploads and attaches new file", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    mock.__seed("manual_test_evidence", [
      { id: "mt1", firm_client_id: "fc1", engagement_id: "e1" },
    ]);
    const fd = new FormData();
    fd.append("file", new File(["unique-bytes"], "stmt.pdf", { type: "application/pdf" }));
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/manual-tests/mt1/attachments", {
        method: "POST",
        headers: { authorization: "Bearer t" },
        body: fd,
      }),
      { params: Promise.resolve({ id: "mt1" }) },
    );
    expect(res.status).toBe(200);
    expect(attachMock).toHaveBeenCalled();
  });
});

describe("GET /api/reviewer/manual-tests/[id]", () => {
  it("returns signed URLs for attachments", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    mock.__seed("manual_test_evidence", [
      {
        id: "mt1",
        firm_client_id: "fc1",
        engagement_id: "e1",
        close_period_id: "cp1",
        account_category: "cash",
        assertion_id: "accuracy",
        evidence_type: "bank_statement",
        source_type: "upload",
        evidence_summary: "Bank rec",
        content_hash: "h1",
        created_by_user_id: "u1",
        created_at: "2026-07-06T12:00:00Z",
        updated_at: "2026-07-06T12:00:00Z",
        source_key: {},
      },
    ]);
    mock.__seed("manual_test_attachments", [
      {
        attachment_id: "att1",
        evidence_id: "mt1",
        storage_path: "fc1/mt1/abc.pdf",
        original_filename: "stmt.pdf",
        byte_size: 10,
        mime_type: "application/pdf",
        sha256: "abc",
        firm_client_id: "fc1",
      },
    ]);
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/manual-tests/mt1", {
        headers: { authorization: "Bearer t" },
      }),
      { params: Promise.resolve({ id: "mt1" }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.attachments[0].signedUrl).toContain("https://");
    expect(body.strengthContribution).toBe("strong");
  });
});
