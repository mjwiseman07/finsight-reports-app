import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit-ready/server-auth", () => ({
  requireAuditReadyUser: vi.fn(),
  getEngagementActor: vi.fn(),
}));

const engagementRow = {
  id: "e-1",
  company_id: "c-1",
  firm_id: null,
  firm_client_id: null,
  engagement_name: "Test",
  audit_period_start: "2026-08-01",
  audit_period_end: "2026-08-31",
};

let engagementResult: { data: unknown; error: unknown } = {
  data: engagementRow,
  error: null,
};

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.order = () => q;
    q.limit = () => Promise.resolve({ data: [], error: null });
    q.maybeSingle = () => Promise.resolve(engagementResult);
    return {
      from: (t: string) => {
        if (t === "pilot_lifecycle_coverage_downloads") {
          return { insert: () => Promise.resolve({ data: null, error: null }) };
        }
        return q;
      },
      rpc: () => Promise.resolve({ data: [], error: null }),
    };
  },
}));

vi.mock("@/lib/pilot-lifecycle/coverage-overlay", () => ({
  buildLifecycleCoverageOverlay: async () => ({
    partition: { company_id: "c-1", firm_id: null },
    total_evidence_events: 0,
    distinct_pcaob_assertions: 0,
    distinct_classification_hints: 0,
    groups: [],
    warnings: [],
    generated_at: "2026-08-04T00:00:00Z",
  }),
}));

vi.mock("@/lib/pilot-lifecycle/pdf/AuditReadyCoveragePdf", () => ({
  generateAuditReadyCoveragePdf: async () => ({
    buffer: Buffer.from("%PDF-1.4 mock"),
    sha256: "a".repeat(64),
    byteSize: 12,
  }),
}));

vi.mock("@/lib/pilot-lifecycle/issue-recorder", () => ({
  recordIssue: async () => ({ id: null, deduped: false, sentryEventId: null }),
}));

import { GET } from "../route";
import * as auth from "@/lib/audit-ready/server-auth";

describe("GET /api/audit-ready/[engagementId]/assertion-coverage/pdf", () => {
  beforeEach(() => {
    vi.mocked(auth.requireAuditReadyUser).mockReset();
    vi.mocked(auth.getEngagementActor).mockReset();
    engagementResult = { data: engagementRow, error: null };
    vi.mocked(auth.requireAuditReadyUser).mockResolvedValue({
      user: { id: "user-1", email: "u@e.com" },
    } as never);
    vi.mocked(auth.getEngagementActor).mockResolvedValue({
      userId: "user-1",
      canRead: true,
      canWrite: false,
      scope: "company",
    });
  });

  it("returns 200 + PDF on happy path", async () => {
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ engagementId: "e-1" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("X-Coverage-Sha256")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns 404 when engagement not found", async () => {
    engagementResult = { data: null, error: null };
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ engagementId: "e-none" }),
    });
    expect(res.status).toBe(404);
  });
});
