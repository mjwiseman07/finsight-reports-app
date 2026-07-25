import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequire = vi.fn();
const mockActor = vi.fn();
const mockBuild = vi.fn();
const mockGetEmitter = vi.fn();
const mockSignedUrl = vi.fn();

const runRow = {
  id: "run-1",
  engagement_id: "eng-1",
  tie_out_kind: "ap_aging",
  status: "completed",
};

let artifacts: Array<{ artifact_kind: string; storage_path: string }> = [];
let runResult: { data: typeof runRow | null; error: null | { message: string } } =
  { data: runRow, error: null };

function makeChain(table: string) {
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    eq() {
      return chain;
    },
    async maybeSingle() {
      if (table === "audit_ready_tie_out_runs") return runResult;
      return { data: null, error: null };
    },
  };
  (chain as { then?: unknown }).then = (resolve: (v: unknown) => unknown) => {
    if (table === "audit_ready_run_artifacts") {
      return Promise.resolve(resolve({ data: artifacts, error: null }));
    }
    return Promise.resolve(resolve({ data: [], error: null }));
  };
  return chain;
}

vi.mock("@/lib/audit-ready/server-auth", () => ({
  requireAuditReadyUser: () => mockRequire(),
  getEngagementActor: (...a: unknown[]) => mockActor(...a),
}));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

vi.mock("@/lib/audit-ready/tie-out/emitters/registry", () => ({
  getEmitter: (...a: unknown[]) => mockGetEmitter(...a),
}));

vi.mock("@/lib/audit-ready/tie-out/upload-artifact", () => ({
  getSignedArtifactUrl: (...a: unknown[]) => mockSignedUrl(...a),
}));

import { GET } from "../route";

const samplePayload = {
  face: {
    mode: "two_sided",
    leftLabel: "AP Subledger",
    leftAmountCents: 100,
    rightLabel: "GL AP Account",
    rightAmountCents: 100,
    varianceCents: 0,
    toleranceCents: 100,
    tieStatus: "ties",
    sections: [],
    engagementName: "Pilot",
    engagementId: "eng-1",
    periodEnd: "2026-06-30",
    tieOutKind: "ap_aging",
    runId: "run-1",
    generatedAt: "2026-07-24T12:00:00Z",
  },
  backupTabs: [],
  sourceData: {
    qboRealmId: "r",
    qboConnectionId: "",
    apiResponseJson: {},
    fetchedAt: "2026-07-24T12:00:00Z",
  },
};

beforeEach(() => {
  mockRequire.mockReset();
  mockActor.mockReset();
  mockBuild.mockReset();
  mockGetEmitter.mockReset();
  mockSignedUrl.mockReset();
  artifacts = [];
  runResult = { data: runRow, error: null };
  mockRequire.mockResolvedValue({ user: { id: "u1" } });
  mockActor.mockResolvedValue({
    userId: "u1",
    canRead: true,
    canWrite: true,
    scope: "company",
  });
  mockBuild.mockResolvedValue(samplePayload);
  mockGetEmitter.mockReturnValue({
    kind: "ap_aging",
    build: mockBuild,
    emitXlsx: vi.fn(),
    emitPdf: vi.fn(),
  });
  mockSignedUrl.mockImplementation(async ({ storagePath }: { storagePath: string }) =>
    `https://signed.example/${storagePath}`,
  );
});

describe("GET /api/audit-ready/runs/[runId]/workpaper", () => {
  it("returns 404 when run_not_found", async () => {
    runResult = { data: null, error: null };
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ runId: "missing" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "run_not_found" });
  });

  it("returns 403 when actor is null", async () => {
    mockActor.mockResolvedValue(null);
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ runId: "run-1" }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("returns 403 when canRead is false", async () => {
    mockActor.mockResolvedValue({
      userId: "u1",
      canRead: false,
      canWrite: false,
      scope: "company",
    });
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ runId: "run-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 501 when kind has no emitter", async () => {
    runResult = {
      data: { ...runRow, tie_out_kind: "bank_recon" },
      error: null,
    };
    mockGetEmitter.mockReturnValue(null);
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ runId: "run-1" }),
    });
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.error).toBe("emitter_not_yet_shipped");
    expect(body.kind).toBe("bank_recon");
  });

  it("returns 200 with payload + downloads on happy path", async () => {
    artifacts = [
      { artifact_kind: "xlsx", storage_path: "eng/run/xlsx-a.xlsx" },
      { artifact_kind: "pdf", storage_path: "eng/run/pdf-b.pdf" },
    ];
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ runId: "run-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.payload.face.tieOutKind).toBe("ap_aging");
    expect(body.downloads.xlsx).toContain("xlsx-a.xlsx");
    expect(body.downloads.pdf).toContain("pdf-b.pdf");
    expect(mockBuild).toHaveBeenCalledWith("run-1");
  });
});
