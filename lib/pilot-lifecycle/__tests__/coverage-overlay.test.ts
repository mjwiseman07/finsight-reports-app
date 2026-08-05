import { describe, it, expect } from "vitest";
import { buildLifecycleCoverageOverlay } from "../coverage-overlay";

function mockSupabase(rows: unknown[], error: unknown = null) {
  const q: Record<string, unknown> = {};
  const terminal = () => Promise.resolve({ data: rows, error });
  q.select = () => q;
  q.eq = () => q;
  q.order = () => q;
  q.limit = () => q;
  q.then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => terminal().then(resolve, reject);
  return { from: () => q };
}

describe("buildLifecycleCoverageOverlay", () => {
  it("empty chain returns zero groups zero warnings", async () => {
    const supabase = mockSupabase([]);
    const overlay = await buildLifecycleCoverageOverlay({
      companyId: "c1",
      firmId: null,
      supabase: supabase as never,
    });
    expect(overlay.total_evidence_events).toBe(0);
    expect(overlay.groups).toEqual([]);
    expect(overlay.warnings).toEqual([]);
  });

  it("groups by (pcaob, classification_hint)", async () => {
    const supabase = mockSupabase([
      {
        id: "e1",
        event_at: "2026-08-01T00:00:00Z",
        event_kind: "pilot.lifecycle.assertion.evidence-attached",
        assertions_covered: ["existence"],
        classification_hint: "asc606",
        evidence_refs: [{ kind: "pbc", id: "pbc-1" }],
      },
      {
        id: "e2",
        event_at: "2026-08-02T00:00:00Z",
        event_kind: "pilot.lifecycle.assertion.evidence-attached",
        assertions_covered: ["existence"],
        classification_hint: "asc606",
        evidence_refs: [{ kind: "pbc", id: "pbc-2" }],
      },
      {
        id: "e3",
        event_at: "2026-08-03T00:00:00Z",
        event_kind: "pilot.lifecycle.assertion.evidence-attached",
        assertions_covered: ["completeness"],
        classification_hint: null,
        evidence_refs: [],
      },
    ]);
    const overlay = await buildLifecycleCoverageOverlay({
      companyId: "c1",
      firmId: null,
      supabase: supabase as never,
    });
    expect(overlay.total_evidence_events).toBe(3);
    expect(overlay.groups.length).toBe(2);
    const existence = overlay.groups.find(
      (g) => g.pcaob_assertion === "existence",
    )!;
    expect(existence.event_count).toBe(2);
    expect(existence.classification_hint).toBe("asc606");
    expect(existence.sample_event_ids).toEqual(["e1", "e2"]);
    expect(overlay.distinct_pcaob_assertions).toBe(2);
    expect(overlay.distinct_classification_hints).toBe(1);
  });

  it("multi-assertion event fans out into multiple groups", async () => {
    const supabase = mockSupabase([
      {
        id: "e1",
        event_at: "2026-08-01T00:00:00Z",
        event_kind: "pilot.lifecycle.assertion.evidence-attached",
        assertions_covered: ["existence", "completeness", "accuracy"],
        classification_hint: "revenue",
        evidence_refs: [],
      },
    ]);
    const overlay = await buildLifecycleCoverageOverlay({
      companyId: "c1",
      firmId: null,
      supabase: supabase as never,
    });
    expect(overlay.groups.length).toBe(3);
    expect(overlay.total_evidence_events).toBe(1);
    expect(overlay.distinct_pcaob_assertions).toBe(3);
  });

  it("unmapped assertion becomes a reconciliation warning (not silent drop)", async () => {
    const supabase = mockSupabase([
      {
        id: "e1",
        event_at: "2026-08-01T00:00:00Z",
        event_kind: "pilot.lifecycle.assertion.evidence-attached",
        assertions_covered: ["typo_assertion"],
        classification_hint: null,
        evidence_refs: [],
      },
      {
        id: "e2",
        event_at: "2026-08-02T00:00:00Z",
        event_kind: "pilot.lifecycle.assertion.evidence-attached",
        assertions_covered: [],
        classification_hint: null,
        evidence_refs: [],
      },
    ]);
    const overlay = await buildLifecycleCoverageOverlay({
      companyId: "c1",
      firmId: null,
      supabase: supabase as never,
    });
    expect(overlay.warnings.length).toBe(2);
    expect(overlay.warnings[0].reason).toBe("unmapped_assertion");
    expect(overlay.warnings[1].reason).toBe("empty_assertions");
    expect(overlay.groups.length).toBe(0);
  });
});
