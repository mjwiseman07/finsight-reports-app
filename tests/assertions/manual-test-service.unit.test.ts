import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";
import {
  attachFileToManualTest,
  computeManualTestContentHash,
  createManualTestEvidence,
} from "@/lib/assertions/manual-test-service";

const mock = makeMockDb();
const publishMock = vi.hoisted(() => vi.fn());
const resolveMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishMock }));
vi.mock("@/lib/assertions/gap-review-item-resolver", () => ({
  resolveGapReviewItem: resolveMock,
}));

const baseInput = {
  firmClientId: "fc1",
  engagementId: "eng1",
  closePeriodId: "cp1",
  accountCategory: "cash",
  assertionId: "accuracy",
  evidenceType: "bank_statement" as const,
  sourceType: "upload",
  evidenceSummary: "Bank rec performed for June close",
  createdByUserId: "u1",
};

beforeEach(() => {
  mock.__reset();
  publishMock.mockReset();
  resolveMock.mockReset();
  publishMock.mockResolvedValue({ eventId: "evt-1" });
  resolveMock.mockResolvedValue({ id: "gap1", resolutionStatus: "resolved_remediated" });
});

describe("manual-test-service", () => {
  it("create without gap link", async () => {
    const row = await createManualTestEvidence(mock as never, baseInput);
    expect(row.id).toBeTruthy();
    expect(mock.__state.manual_test_evidence).toHaveLength(1);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "assertion.manual_test.created" }),
    );
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it("content-hash idempotency on duplicate upsert", async () => {
    await createManualTestEvidence(mock as never, baseInput);
    await createManualTestEvidence(mock as never, baseInput);
    expect(mock.__state.manual_test_evidence).toHaveLength(1);
  });

  it("computeManualTestContentHash is stable", () => {
    const a = computeManualTestContentHash(baseInput);
    const b = computeManualTestContentHash(baseInput);
    expect(a).toBe(b);
  });

  it("auto-resolves gap when resolvesGapItemId provided", async () => {
    await createManualTestEvidence(mock as never, {
      ...baseInput,
      resolvesGapItemId: "gap1",
    });
    expect(resolveMock).toHaveBeenCalledWith(
      mock,
      "gap1",
      expect.objectContaining({ resolutionType: "manual_test" }),
    );
  });

  it("attach idempotent on same sha256", async () => {
    mock.__seed("manual_test_evidence", [{ id: "ev1", firm_client_id: "fc1", engagement_id: "eng1" }]);
    const a = await attachFileToManualTest(mock as never, {
      evidenceId: "ev1",
      firmClientId: "fc1",
      engagementId: "eng1",
      originalFilename: "stmt.pdf",
      mimeType: "application/pdf",
      byteSize: 100,
      sha256: "abc",
      storagePath: "fc1/ev1/abc.pdf",
      ingestedFrom: "reviewer_upload",
      ingestedBy: "u1",
    });
    const b = await attachFileToManualTest(mock as never, {
      evidenceId: "ev1",
      firmClientId: "fc1",
      engagementId: "eng1",
      originalFilename: "stmt.pdf",
      mimeType: "application/pdf",
      byteSize: 100,
      sha256: "abc",
      storagePath: "fc1/ev1/abc.pdf",
      ingestedFrom: "reviewer_upload",
      ingestedBy: "u1",
    });
    expect(a.attachmentId).toBe(b.attachmentId);
    expect(mock.__state.manual_test_attachments).toHaveLength(1);
  });

  it("attach emits assertion.manual_test.attached", async () => {
    mock.__seed("manual_test_evidence", [{ id: "ev1", firm_client_id: "fc1", engagement_id: "eng1" }]);
    await attachFileToManualTest(mock as never, {
      evidenceId: "ev1",
      firmClientId: "fc1",
      engagementId: "eng1",
      originalFilename: "stmt.pdf",
      mimeType: "application/pdf",
      byteSize: 100,
      sha256: "def",
      storagePath: "fc1/ev1/def.pdf",
      ingestedFrom: "reviewer_upload",
      ingestedBy: "u1",
    });
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "assertion.manual_test.attached" }),
    );
  });
});
