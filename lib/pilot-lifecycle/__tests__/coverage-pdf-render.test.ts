import { describe, it, expect } from "vitest";
import { generateAuditReadyCoveragePdf } from "../pdf/AuditReadyCoveragePdf";
import type { PilotLifecycleCoverageOverlay } from "../coverage-overlay";

const baseInput = {
  engagement: {
    id: "824546e9-6deb-4f7f-b8ad-88e5ee65353d",
    company_id: "c1",
    firm_id: null,
    firm_client_name: "Test Client Inc.",
    period_label: "Engagement 824546e9 — 2026-08-04",
  },
  chain: {
    verified_at: "2026-08-04T20:00:00Z",
    is_intact: true,
    break_count: 0,
  },
};

describe("generateAuditReadyCoveragePdf", () => {
  it("renders with empty overlay and produces a valid PDF buffer + sha256", async () => {
    const overlay: PilotLifecycleCoverageOverlay = {
      partition: { company_id: "c1", firm_id: null },
      total_evidence_events: 0,
      distinct_pcaob_assertions: 0,
      distinct_classification_hints: 0,
      groups: [],
      warnings: [],
      generated_at: "2026-08-04T20:00:00Z",
    };
    const { buffer, sha256, byteSize } = await generateAuditReadyCoveragePdf({
      ...baseInput,
      overlay,
    });
    expect(byteSize).toBeGreaterThan(1000);
    expect(sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(buffer.slice(0, 4).toString()).toBe("%PDF");
  });

  it("renders with a full overlay including warnings", async () => {
    const overlay: PilotLifecycleCoverageOverlay = {
      partition: { company_id: "c1", firm_id: null },
      total_evidence_events: 3,
      distinct_pcaob_assertions: 2,
      distinct_classification_hints: 1,
      groups: [
        {
          pcaob_assertion: "existence",
          isa_assertion_ids: ["existence_occurrence"],
          classification_hint: "asc606_rev_rec",
          event_count: 2,
          first_event_at: "2026-08-01T00:00:00Z",
          last_event_at: "2026-08-03T00:00:00Z",
          sample_evidence_refs: [{ kind: "pbc", id: "pbc-1" }],
          sample_event_ids: ["e1", "e2"],
        },
        {
          pcaob_assertion: "completeness",
          isa_assertion_ids: ["completeness"],
          classification_hint: null,
          event_count: 1,
          first_event_at: "2026-08-04T00:00:00Z",
          last_event_at: "2026-08-04T00:00:00Z",
          sample_evidence_refs: [],
          sample_event_ids: ["e3"],
        },
      ],
      warnings: [
        {
          event_id: "eW1",
          event_at: "2026-08-05T00:00:00Z",
          reason: "unmapped_assertion",
          detail:
            'assertions_covered value "typo" is not in the locked PCAOB-6 taxonomy',
        },
      ],
      generated_at: "2026-08-05T00:00:00Z",
    };
    const { buffer, sha256, byteSize } = await generateAuditReadyCoveragePdf({
      ...baseInput,
      overlay,
    });
    expect(byteSize).toBeGreaterThan(2000);
    expect(sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(buffer.slice(0, 4).toString()).toBe("%PDF");
  });
});
