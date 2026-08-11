import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/erp/quickbooks/journal-entry-poster.legacy", () => ({
  qboJournalEntryPoster: {
    post: vi.fn(async () => ({ status: "posted", attempt_id: "legacy-att", qbo_je_id: "legacy-je-1" })),
    reverse: vi.fn(async () => ({ status: "posted", attempt_id: "legacy-rev-att", qbo_je_id: "legacy-je-rev" })),
  },
}));
vi.mock("@/lib/erp/quickbooks/journal-entry-poster.wb-delegate", () => ({
  postViaWriteBoundary: vi.fn(async () => ({ status: "posted", attempt_id: "wb-att", qbo_je_id: "wb-je-1" })),
  reverseViaWriteBoundary: vi.fn(async () => ({ status: "posted", attempt_id: "wb-rev-att", qbo_je_id: "wb-je-rev" })),
}));

import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";
import { qboJournalEntryPoster as legacyQboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster.legacy";
import { postViaWriteBoundary } from "@/lib/erp/quickbooks/journal-entry-poster.wb-delegate";

const validReq = {
  firm_client_id: "fc-1",
  idempotency_key: "canary-1",
  source_type: "manual" as const,
  posted_by: "human" as const,
  posted_by_user_id: "user-1",
  payload: {
    transaction_date: "2026-08-01",
    lines: [
      { account_id: "1", posting_type: "Debit" as const, amount: 100, description: "dr" },
      { account_id: "2", posting_type: "Credit" as const, amount: 100, description: "cr" },
    ],
  },
};

describe("qboJournalEntryPoster canary switch", () => {
  const orig = process.env.WRITE_BOUNDARY_ENABLED;
  afterEach(() => {
    process.env.WRITE_BOUNDARY_ENABLED = orig;
    vi.clearAllMocks();
  });

  it("delegates to legacy when WRITE_BOUNDARY_ENABLED unset", async () => {
    delete process.env.WRITE_BOUNDARY_ENABLED;
    const r = await qboJournalEntryPoster.post(validReq);
    expect(r.status).toBe("posted");
    if (r.status === "posted") expect(r.qbo_je_id).toBe("legacy-je-1");
    expect(legacyQboJournalEntryPoster.post).toHaveBeenCalledOnce();
    expect(postViaWriteBoundary).not.toHaveBeenCalled();
  });

  it("delegates to legacy when WRITE_BOUNDARY_ENABLED=false", async () => {
    process.env.WRITE_BOUNDARY_ENABLED = "false";
    const r = await qboJournalEntryPoster.post(validReq);
    expect(r.status).toBe("posted");
    if (r.status === "posted") expect(r.qbo_je_id).toBe("legacy-je-1");
    expect(postViaWriteBoundary).not.toHaveBeenCalled();
  });

  it("delegates to write-boundary when WRITE_BOUNDARY_ENABLED=true", async () => {
    process.env.WRITE_BOUNDARY_ENABLED = "true";
    const r = await qboJournalEntryPoster.post(validReq);
    expect(r.status).toBe("posted");
    if (r.status === "posted") expect(r.qbo_je_id).toBe("wb-je-1");
    expect(postViaWriteBoundary).toHaveBeenCalledOnce();
    expect(legacyQboJournalEntryPoster.post).not.toHaveBeenCalled();
  });

  it("reverse honors canary flag", async () => {
    process.env.WRITE_BOUNDARY_ENABLED = "true";
    const r = await qboJournalEntryPoster.reverse("some-att", "test", "user-1");
    expect(r.status).toBe("posted");
    if (r.status === "posted") expect(r.qbo_je_id).toBe("wb-je-rev");
  });
});
