/**
 * Block 7 — Build a PilotLifecycleCoverageOverlay from lifecycle events for
 * an AR engagement partition (company_id / firm_id).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PcaobAssertion } from "./types";
import type { AssertionId } from "@/lib/pre-close/assertions-types";
import { ASSERTIONS } from "@/lib/audit-ready/assertion-taxonomy";
import { pcaobToIsa } from "./pcaob-assertion-map";

export type LifecycleEvidenceGroup = {
  pcaob_assertion: PcaobAssertion;
  isa_assertion_ids: readonly AssertionId[];
  classification_hint: string | null;
  event_count: number;
  first_event_at: string;
  last_event_at: string;
  sample_evidence_refs: unknown[];
  sample_event_ids: string[];
};

export type LifecycleReconciliationWarning = {
  event_id: string;
  event_at: string;
  reason: "unmapped_assertion" | "empty_assertions" | "other";
  detail: string;
};

export type PilotLifecycleCoverageOverlay = {
  partition: { company_id: string | null; firm_id: string | null };
  total_evidence_events: number;
  distinct_pcaob_assertions: number;
  distinct_classification_hints: number;
  groups: LifecycleEvidenceGroup[];
  warnings: LifecycleReconciliationWarning[];
  generated_at: string;
};

const PCAOB_SET = new Set<string>(ASSERTIONS);

type LifecycleEventRow = {
  id: string;
  event_at: string;
  event_kind: string;
  assertions_covered: string[] | null;
  classification_hint: string | null;
  evidence_refs: unknown;
};

type GroupKey = string;

function groupKey(pcaob: PcaobAssertion, hint: string | null): GroupKey {
  return `${pcaob}::${hint ?? "__none__"}`;
}

export async function buildLifecycleCoverageOverlay(args: {
  companyId: string | null;
  firmId: string | null;
  supabase: SupabaseClient;
}): Promise<PilotLifecycleCoverageOverlay> {
  const { companyId, firmId, supabase } = args;

  if (!companyId && !firmId) {
    throw new Error(
      "buildLifecycleCoverageOverlay: at least one of companyId or firmId is required",
    );
  }

  let query = supabase
    .from("pilot_lifecycle_events")
    .select(
      "id, event_at, event_kind, assertions_covered, classification_hint, evidence_refs",
    )
    .eq("event_kind", "pilot.lifecycle.assertion.evidence-attached")
    .order("event_at", { ascending: true })
    .limit(5000);
  if (companyId) query = query.eq("company_id", companyId);
  else query = query.eq("firm_id", firmId);

  const { data, error } = await query;
  if (error) {
    throw new Error(`coverage-overlay query failed: ${error.message}`);
  }
  const rows = (data ?? []) as LifecycleEventRow[];

  const groupsMap = new Map<GroupKey, LifecycleEvidenceGroup>();
  const warnings: LifecycleReconciliationWarning[] = [];
  const hintsSet = new Set<string>();

  for (const row of rows) {
    if (!row.assertions_covered || row.assertions_covered.length === 0) {
      warnings.push({
        event_id: row.id,
        event_at: row.event_at,
        reason: "empty_assertions",
        detail: "evidence-attached event has no assertions_covered",
      });
      continue;
    }
    for (const raw of row.assertions_covered) {
      if (!PCAOB_SET.has(raw)) {
        warnings.push({
          event_id: row.id,
          event_at: row.event_at,
          reason: "unmapped_assertion",
          detail: `assertions_covered value "${raw}" is not in the locked PCAOB-6 taxonomy`,
        });
        continue;
      }
      const pcaob = raw as PcaobAssertion;
      const hint = row.classification_hint;
      if (hint) hintsSet.add(hint);
      const key = groupKey(pcaob, hint);
      let g = groupsMap.get(key);
      if (!g) {
        g = {
          pcaob_assertion: pcaob,
          isa_assertion_ids: pcaobToIsa(pcaob),
          classification_hint: hint,
          event_count: 0,
          first_event_at: row.event_at,
          last_event_at: row.event_at,
          sample_evidence_refs: [],
          sample_event_ids: [],
        };
        groupsMap.set(key, g);
      }
      g.event_count += 1;
      if (row.event_at < g.first_event_at) g.first_event_at = row.event_at;
      if (row.event_at > g.last_event_at) g.last_event_at = row.event_at;
      if (g.sample_event_ids.length < 3) g.sample_event_ids.push(row.id);
      if (g.sample_evidence_refs.length < 3 && row.evidence_refs) {
        const refs = Array.isArray(row.evidence_refs)
          ? row.evidence_refs
          : [row.evidence_refs];
        for (const r of refs) {
          if (g.sample_evidence_refs.length >= 3) break;
          g.sample_evidence_refs.push(r);
        }
      }
    }
  }

  const groups = Array.from(groupsMap.values()).sort((a, b) => {
    if (a.pcaob_assertion !== b.pcaob_assertion) {
      return a.pcaob_assertion.localeCompare(b.pcaob_assertion);
    }
    if (a.classification_hint === b.classification_hint) return 0;
    if (a.classification_hint === null) return 1;
    if (b.classification_hint === null) return -1;
    return a.classification_hint.localeCompare(b.classification_hint);
  });

  const distinctPcaob = new Set(groups.map((g) => g.pcaob_assertion)).size;

  return {
    partition: { company_id: companyId, firm_id: firmId },
    total_evidence_events: rows.length,
    distinct_pcaob_assertions: distinctPcaob,
    distinct_classification_hints: hintsSet.size,
    groups,
    warnings,
    generated_at: new Date().toISOString(),
  };
}
