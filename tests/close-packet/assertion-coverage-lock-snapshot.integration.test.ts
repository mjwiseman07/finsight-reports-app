import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();
const snapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => mock,
}));
vi.mock("@/lib/firm-security", () => ({
  resolveFirmAccess: vi.fn().mockResolvedValue({ userId: "u1", response: null }),
}));
vi.mock("@/lib/close-packet/assertion-coverage-snapshot", () => ({
  snapshotCoverageStatement: snapshotMock,
}));

import { POST as lockPacket } from "@/app/api/close-packets/[packetId]/lock/route";
import { resolveFirmAccess } from "@/lib/firm-security";

const PACKET = "pkt1";
const CP = "cp1";
const FC = "fc1";

function seedPacket(sections: Array<{ section_key: string; content_json: Record<string, unknown> }>) {
  mock.__seed("close_packets", [
    { id: PACKET, status: "draft", close_period_id: CP, version: 2 },
  ]);
  mock.__seed("close_periods", [{ id: CP, firm_client_id: FC }]);
  mock.__seed(
    "close_packet_sections",
    sections.map((s) => ({ packet_id: PACKET, ...s })),
  );
}

beforeEach(() => {
  mock.__reset();
  snapshotMock.mockReset();
  snapshotMock.mockResolvedValue({ snapshot_id: "snap-1", content_sha256: "abc" });
  vi.mocked(resolveFirmAccess).mockResolvedValue({
    userId: "u1",
    memberships: [{ firm_id: "f1", role: "firm_admin", status: "active" }],
    firmIds: ["f1"],
  });
});

describe("lock route assertion coverage snapshot", () => {
  it("calls snapshotCoverageStatement when assertion_coverage section exists", async () => {
    seedPacket([
      {
        section_key: "assertion_coverage",
        content_json: { status: "ok", version: 1, content_type: "assertion_coverage_statement", summary: { total_cells: 1, tested: 0, partial: 0, gap: 1, not_applicable: 0, gaps_by_root_cause: {}, coverage_rate_pct: 0, critical_gaps: 1 }, isa_315_baseline_version: "ISA 315 (Revised 2019)" },
      },
    ]);
    const res = await lockPacket(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ packetId: PACKET }),
    });
    expect(res.status).toBe(200);
    expect(snapshotMock).toHaveBeenCalledOnce();
    expect(snapshotMock.mock.calls[0][0].packetVersion).toBe(2);
  });

  it("skips snapshot when section has status=error", async () => {
    seedPacket([
      { section_key: "assertion_coverage", content_json: { status: "error", error_message: "x" } },
    ]);
    await lockPacket(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ packetId: PACKET }),
    });
    expect(snapshotMock).not.toHaveBeenCalled();
  });

  it("continues on snapshot error without blocking lock", async () => {
    seedPacket([
      {
        section_key: "assertion_coverage",
        content_json: { status: "ok", version: 1, content_type: "assertion_coverage_statement", summary: { total_cells: 1, tested: 0, partial: 0, gap: 0, not_applicable: 1, gaps_by_root_cause: {}, coverage_rate_pct: 0, critical_gaps: 0 }, isa_315_baseline_version: "ISA 315 (Revised 2019)" },
      },
    ]);
    snapshotMock.mockRejectedValue(new Error("snapshot failed"));
    const res = await lockPacket(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ packetId: PACKET }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("snapshot row uses correct packet_version", async () => {
    seedPacket([
      {
        section_key: "assertion_coverage",
        content_json: { status: "ok", version: 1, content_type: "assertion_coverage_statement", summary: { total_cells: 1, tested: 1, partial: 0, gap: 0, not_applicable: 0, gaps_by_root_cause: {}, coverage_rate_pct: 100, critical_gaps: 0 }, isa_315_baseline_version: "ISA 315 (Revised 2019)" },
      },
    ]);
    await lockPacket(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ packetId: PACKET }),
    });
    expect(snapshotMock.mock.calls[0][0].packetVersion).toBe(2);
  });

  it("second lock invokes snapshot again with same packet_version", async () => {
    seedPacket([
      {
        section_key: "assertion_coverage",
        content_json: {
          status: "ok",
          version: 1,
          content_type: "assertion_coverage_statement",
          summary: {
            total_cells: 1,
            tested: 0,
            partial: 0,
            gap: 1,
            not_applicable: 0,
            gaps_by_root_cause: {},
            coverage_rate_pct: 0,
            critical_gaps: 1,
          },
          isa_315_baseline_version: "ISA 315 (Revised 2019)",
        },
      },
    ]);
    await lockPacket(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ packetId: PACKET }),
    });
    mock.__state.close_packets[0].status = "draft";
    await lockPacket(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ packetId: PACKET }),
    });
    expect(snapshotMock).toHaveBeenCalledTimes(2);
    expect(snapshotMock.mock.calls[0][0].packetVersion).toBe(2);
    expect(snapshotMock.mock.calls[1][0].packetVersion).toBe(2);
  });
});
