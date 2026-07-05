/**
 * D-Assertions Part 3 — close-packet section builder for 'assertion_coverage'.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ATTESTATION_FOOTER } from "@/lib/pre-close/assertion-coverage-statement-types";

export const MAX_DRILLDOWNS_PER_CELL = 10;

function pct(numer, denom) {
  if (!denom) return 0;
  return Math.round((numer / denom) * 1000) / 10;
}

function evidenceStrengthLabelFor(strength) {
  if (strength === "strong") return "● Strong";
  if (strength === "moderate") return "◐ Moderate";
  if (strength === "weak") return "○ Weak";
  return "— Unassessed";
}

function extractPcaobReference(citation) {
  if (!citation || typeof citation !== "string") return null;
  const match = citation.match(/PCAOB[^;]*/i);
  return match ? match[0].trim() : null;
}

function mapCatalogRow(row) {
  const citation = row.authoritative_citation || row.isa_315_label || "";
  return {
    assertion_id: row.assertion_id,
    display_name: row.display_name,
    isa_315_reference: citation,
    pcaob_reference: extractPcaobReference(citation),
    description: row.description || "",
  };
}

async function loadCatalog(supabase) {
  const { data, error } = await supabase
    .from("assertions_catalog")
    .select("assertion_id, display_name, isa_315_label, authoritative_citation, description")
    .order("assertion_id");
  if (error) throw new Error(`assertions_catalog load failed: ${error.message}`);
  return (data || []).map(mapCatalogRow);
}

async function loadRootCauses(supabase) {
  const { data, error } = await supabase
    .from("assertion_gap_root_causes")
    .select("root_cause_code, display_name, description, pcaob_reference")
    .order("root_cause_code");
  if (error) throw new Error(`assertion_gap_root_causes load failed: ${error.message}`);
  return data || [];
}

async function loadCoverage(supabase, closePeriodId) {
  const { data, error } = await supabase
    .from("close_assertion_coverage")
    .select("*")
    .eq("close_period_id", closePeriodId)
    .order("account_category")
    .order("assertion_id");
  if (error) throw new Error(`close_assertion_coverage load failed: ${error.message}`);
  return data || [];
}

async function loadFireDrilldowns(supabase, fireIds) {
  if (!fireIds || fireIds.length === 0) return {};
  const { data, error } = await supabase
    .from("curated_rule_fires")
    .select("fire_id, rule_id, rule_version, created_at, outcome")
    .in("fire_id", fireIds);
  if (error) return {};
  const byId = {};
  for (const row of data || []) {
    byId[row.fire_id] = row;
  }
  return byId;
}

async function loadReviewItemsForFires(supabase, fireIds) {
  if (!fireIds || fireIds.length === 0) return {};
  const { data, error } = await supabase
    .from("pre_close_review_items")
    .select("id, fire_id, decision")
    .in("fire_id", fireIds);
  if (error) return {};
  const byFire = {};
  for (const row of data || []) {
    byFire[row.fire_id] = row;
  }
  return byFire;
}

export async function build(ctx) {
  const { closePeriod, firmClient, supabase: injected } = ctx;
  const supabase = injected || getSupabaseAdmin();

  if (!closePeriod?.id) {
    return { status: "error", error_message: "closePeriod.id required" };
  }

  try {
    const [catalog, rootCauses, coverage] = await Promise.all([
      loadCatalog(supabase),
      loadRootCauses(supabase),
      loadCoverage(supabase, closePeriod.id),
    ]);

    const allFireIds = new Set();
    for (const row of coverage) {
      for (const fid of (row.covering_fire_ids || []).slice(0, MAX_DRILLDOWNS_PER_CELL)) {
        allFireIds.add(fid);
      }
    }
    const fireIdList = Array.from(allFireIds);
    const [fireById, reviewItemByFire] = await Promise.all([
      loadFireDrilldowns(supabase, fireIdList),
      loadReviewItemsForFires(supabase, fireIdList),
    ]);

    const firmClientId = firmClient?.id || closePeriod.firm_client_id;
    const cells = await Promise.all(
      coverage.map(async (row) => {
        const drilldowns = (row.covering_fire_ids || [])
          .slice(0, MAX_DRILLDOWNS_PER_CELL)
          .map((fid) => {
            const fire = fireById[fid];
            const ri = reviewItemByFire[fid];
            if (!fire) return null;
            return {
              fire_id: fire.fire_id,
              rule_id: fire.rule_id,
              rule_version: fire.rule_version,
              fired_at: fire.created_at,
              outcome: fire.outcome,
              review_item_id: ri?.id || null,
              review_item_decision: ri?.decision || null,
            };
          })
          .filter(Boolean);

        const cell = {
          account_category: row.account_category,
          assertion_id: row.assertion_id,
          relevance_at_computation: row.relevance_at_computation,
          coverage_status: row.coverage_status,
          evidence_strength: row.evidence_strength,
          evidence_strength_label: evidenceStrengthLabelFor(row.evidence_strength),
          covering_rule_ids: row.covering_rule_ids || [],
          covering_fire_ids: row.covering_fire_ids || [],
          covering_manual_test_ids: row.covering_manual_test_ids || [],
          data_source_reliability_basis: row.data_source_reliability_basis,
          manual_test_ref: row.manual_test_ref,
          gap_root_cause_code: row.gap_root_cause_code,
          gap_recommendation: row.gap_recommendation,
          drilldowns,
        };

        if (row.coverage_status === "gap") {
          const { data: gap } = await supabase
            .from("close_gap_review_items")
            .select("id, resolution_status, resolution_type")
            .eq("firm_client_id", firmClientId)
            .eq("close_period_id", closePeriod.id)
            .eq("account_category", row.account_category)
            .eq("assertion_id", row.assertion_id)
            .maybeSingle();
          cell.remediation = gap
            ? {
                gap_item_id: gap.id,
                status: gap.resolution_status,
                type: gap.resolution_type,
              }
            : null;
        }

        return cell;
      }),
    );

    const summary = {
      total_cells: cells.length,
      tested: 0,
      partial: 0,
      gap: 0,
      not_applicable: 0,
      gaps_by_root_cause: {},
      coverage_rate_pct: 0,
      critical_gaps: 0,
    };

    for (const c of cells) {
      if (c.coverage_status === "tested") summary.tested += 1;
      else if (c.coverage_status === "partial") summary.partial += 1;
      else if (c.coverage_status === "gap") {
        summary.gap += 1;
        if (c.gap_root_cause_code) {
          summary.gaps_by_root_cause[c.gap_root_cause_code] =
            (summary.gaps_by_root_cause[c.gap_root_cause_code] || 0) + 1;
        }
        if (c.relevance_at_computation === "relevant") summary.critical_gaps += 1;
      } else if (c.coverage_status === "not_applicable") summary.not_applicable += 1;
    }

    const relevantCells = summary.total_cells - summary.not_applicable;
    summary.coverage_rate_pct = pct(summary.tested + summary.partial, relevantCells);

    const statement = {
      version: 1,
      content_type: "assertion_coverage_statement",
      isa_315_baseline_version: "ISA 315 (Revised 2019)",
      generated_at: new Date().toISOString(),
      firm_client: {
        id: firmClient?.id || closePeriod.firm_client_id,
        name: firmClient?.name || null,
        industry_vertical: firmClient?.industry_vertical || null,
        accounting_method: firmClient?.accounting_method || null,
        is_demo: firmClient?.is_demo || false,
      },
      close_period: {
        id: closePeriod.id,
        period_start: closePeriod.period_start,
        period_end: closePeriod.period_end,
        status: closePeriod.status || null,
      },
      assertions_catalog: catalog,
      gap_root_causes: rootCauses,
      coverage_cells: cells,
      summary,
      attestation_footer: ATTESTATION_FOOTER,
    };

    return { status: "ok", ...statement };
  } catch (err) {
    return { status: "error", error_message: err.message };
  }
}

/** Strip builder envelope fields for snapshot/PDF consumers. */
export function toAssertionCoverageStatement(built) {
  if (!built || built.status === "error") return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip envelope
  const { status, error_message, ...statement } = built;
  return statement;
}
