/**
 * D-Assertions Part 3 — standalone Coverage Statement React-PDF component.
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createHash } from "node:crypto";
import type { AssertionCoverageStatement } from "@/lib/pre-close/assertion-coverage-statement-types";

export const NO_GAPS_COPY = "No gaps identified for this close period.";

export function gapOverflowCopy(overflow: number): string {
  return `… ${overflow} additional gap${overflow === 1 ? "" : "s"} not shown in this PDF summary.`;
}

export function testedOverflowCopy(overflow: number): string {
  return `… ${overflow} additional tested cells not shown in this PDF summary.`;
}

export function gapListOverflow(gapCount: number): { shown: number; overflow: number } {
  const shown = Math.min(40, gapCount);
  return { shown, overflow: Math.max(0, gapCount - shown) };
}

export function remediationStatusLabel(
  remediation: { status: string; type: string | null } | null | undefined,
): string | null {
  if (!remediation) return null;
  if (remediation.status === "open") return "Gap · Open";
  if (remediation.status === "resolved_deferred") return "Gap · Deferred";
  if (remediation.type === "manual_test") return "Gap · Manual test";
  if (remediation.type === "not_applicable_override") return "Gap · N/A override";
  if (remediation.status === "resolved_remediated") return "Gap · Remediated";
  if (remediation.status === "resolved_stale") return "Gap · Auto-closed";
  if (remediation.status === "resolved_not_applicable") return "Gap · N/A override";
  return `Gap · ${remediation.status}`;
}

export function testedListOverflow(testedCount: number): { shown: number; overflow: number } {
  const shown = Math.min(30, testedCount);
  return { shown, overflow: Math.max(0, testedCount - shown) };
}

const ACCENT = "#01696F";
const DANGER = "#B4283F";
const WARN = "#B47B28";
const OK = "#28A845";
const MUTED = "#666";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 22, color: ACCENT, marginBottom: 4 },
  subtitle: { fontSize: 10, color: MUTED, marginBottom: 16 },
  h2: { fontSize: 12, color: ACCENT, marginTop: 12, marginBottom: 6 },
  h3: { fontSize: 10, color: "#333", marginTop: 8, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, marginBottom: 2 },
  metaLabel: { color: MUTED },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 12 },
  summaryTile: {
    flex: 1,
    marginHorizontal: 3,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  summaryTileLabel: { fontSize: 8, color: MUTED, marginBottom: 3 },
  summaryTileValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  matrixHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 3,
    marginBottom: 3,
  },
  matrixHeaderCategory: { width: "18%", fontSize: 7, fontFamily: "Helvetica-Bold" },
  matrixHeaderAssertion: { flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold", paddingHorizontal: 2 },
  matrixRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee", paddingVertical: 2 },
  matrixCategory: { width: "18%", fontSize: 7, paddingRight: 3 },
  matrixCell: { flex: 1, fontSize: 6, paddingHorizontal: 1, textAlign: "center" },
  statusBadge: { fontSize: 6, padding: 1, borderRadius: 2, textAlign: "center" },
  gapDetailRow: { flexDirection: "row", marginBottom: 3, fontSize: 8 },
  gapDetailLabel: { width: "30%", color: MUTED },
  gapDetailValue: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 4,
  },
  attestPara: { fontSize: 7.5, color: "#333", marginTop: 2, lineHeight: 1.4 },
  citation: { fontSize: 7, color: MUTED, marginTop: 8, fontStyle: "italic" },
});

const STATUS_COLOR: Record<string, string> = {
  tested: OK,
  partial: WARN,
  gap: DANGER,
  not_applicable: MUTED,
};

const STATUS_LABEL: Record<string, string> = {
  tested: "T",
  partial: "P",
  gap: "G",
  not_applicable: "—",
};

const ASSERTION_SHORT: Record<string, string> = {
  existence_occurrence: "Exist",
  completeness: "Compl",
  rights_obligations: "R&O",
  valuation_allocation: "Val",
  accuracy: "Acc",
  cutoff: "Cutoff",
  classification: "Class",
  presentation_disclosure: "P&D",
};

function fmtCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CoverStrip({ summary }: { summary: AssertionCoverageStatement["summary"] }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>Coverage Rate</Text>
        <Text style={[styles.summaryTileValue, { color: ACCENT }]}>
          {summary.coverage_rate_pct.toFixed(1)}%
        </Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>Tested</Text>
        <Text style={[styles.summaryTileValue, { color: OK }]}>{summary.tested}</Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>Partial</Text>
        <Text style={[styles.summaryTileValue, { color: WARN }]}>{summary.partial}</Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>Gaps</Text>
        <Text style={[styles.summaryTileValue, { color: DANGER }]}>
          {summary.gap}
          {summary.critical_gaps > 0 ? ` (${summary.critical_gaps}★)` : ""}
        </Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>N/A</Text>
        <Text style={[styles.summaryTileValue, { color: MUTED }]}>{summary.not_applicable}</Text>
      </View>
    </View>
  );
}

export function MatrixTable({ statement }: { statement: AssertionCoverageStatement }) {
  const byCategory: Record<string, Record<string, (typeof statement.coverage_cells)[number]>> = {};
  for (const cell of statement.coverage_cells) {
    if (!byCategory[cell.account_category]) byCategory[cell.account_category] = {};
    byCategory[cell.account_category][cell.assertion_id] = cell;
  }
  const cats = Object.keys(byCategory).sort();
  const catalog = statement.assertions_catalog;

  return (
    <View>
      <View style={styles.matrixHeaderRow}>
        <Text style={styles.matrixHeaderCategory}>Account Category</Text>
        {catalog.map((a) => (
          <Text key={a.assertion_id} style={styles.matrixHeaderAssertion}>
            {ASSERTION_SHORT[a.assertion_id] || a.assertion_id}
          </Text>
        ))}
      </View>
      {cats.map((cat) => (
        <View key={cat} style={styles.matrixRow}>
          <Text style={styles.matrixCategory}>{fmtCategory(cat)}</Text>
          {catalog.map((a) => {
            const cell = byCategory[cat]?.[a.assertion_id];
            if (!cell) {
              return (
                <View key={a.assertion_id} style={styles.matrixCell}>
                  <Text> </Text>
                </View>
              );
            }
            const color = STATUS_COLOR[cell.coverage_status] || MUTED;
            const label =
              STATUS_LABEL[cell.coverage_status] ||
              cell.coverage_status[0]?.toUpperCase() ||
              "?";
            const remediationLabel =
              cell.coverage_status === "gap"
                ? remediationStatusLabel(cell.remediation)
                : null;
            return (
              <View key={a.assertion_id} style={styles.matrixCell}>
                <Text style={[styles.statusBadge, { color, borderWidth: 0.5, borderColor: color }]}>
                  {label}
                </Text>
                {remediationLabel ? (
                  <Text style={{ fontSize: 4, color: MUTED, marginTop: 1, textAlign: "center" }}>
                    {remediationLabel}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
      <Text style={[styles.attestPara, { marginTop: 8, color: MUTED }]}>
        Legend: T = Tested · P = Partial · G = Gap · — = Not Applicable · ★ = critical gap
      </Text>
    </View>
  );
}

export function GapDetail({ statement }: { statement: AssertionCoverageStatement }) {
  const gaps = statement.coverage_cells.filter((c) => c.coverage_status === "gap");
  if (gaps.length === 0) {
    return (
      <View>
        <Text style={styles.h2}>Identified Gaps</Text>
        <Text style={styles.attestPara}>{NO_GAPS_COPY}</Text>
      </View>
    );
  }
  const rootCauseByCode = Object.fromEntries(
    statement.gap_root_causes.map((r) => [r.root_cause_code, r]),
  );
  const shown = gaps.slice(0, gapListOverflow(gaps.length).shown);
  const overflow = gapListOverflow(gaps.length).overflow;

  return (
    <View>
      <Text style={styles.h2}>Identified Gaps ({gaps.length})</Text>
      {shown.map((gap, idx) => {
        const rc = gap.gap_root_cause_code ? rootCauseByCode[gap.gap_root_cause_code] : null;
        return (
          <View key={`${gap.account_category}-${gap.assertion_id}`} style={{ marginBottom: 8 }} wrap={false}>
            <Text style={styles.h3}>
              {idx + 1}. {fmtCategory(gap.account_category)} — {gap.assertion_id.replace(/_/g, " ")}
            </Text>
            <View style={styles.gapDetailRow}>
              <Text style={styles.gapDetailLabel}>Relevance</Text>
              <Text style={styles.gapDetailValue}>{gap.relevance_at_computation}</Text>
            </View>
            {rc && (
              <>
                <View style={styles.gapDetailRow}>
                  <Text style={styles.gapDetailLabel}>Root Cause</Text>
                  <Text style={styles.gapDetailValue}>{rc.display_name}</Text>
                </View>
                <View style={styles.gapDetailRow}>
                  <Text style={styles.gapDetailLabel}>PCAOB Reference</Text>
                  <Text style={styles.gapDetailValue}>{rc.pcaob_reference}</Text>
                </View>
              </>
            )}
            {gap.gap_recommendation && (
              <View style={styles.gapDetailRow}>
                <Text style={styles.gapDetailLabel}>Recommendation</Text>
                <Text style={styles.gapDetailValue}>{gap.gap_recommendation}</Text>
              </View>
            )}
          </View>
        );
      })}
      {overflow > 0 && (
        <Text style={styles.attestPara}>{gapOverflowCopy(overflow)}</Text>
      )}
    </View>
  );
}

export function TestedEvidence({ statement }: { statement: AssertionCoverageStatement }) {
  const tested = statement.coverage_cells.filter(
    (c) => c.coverage_status === "tested" || c.coverage_status === "partial",
  );
  if (tested.length === 0) return null;
  const shown = tested.slice(0, testedListOverflow(tested.length).shown);
  const overflow = testedListOverflow(tested.length).overflow;

  return (
    <View>
      <Text style={styles.h2}>Evidence Drill-Down (Tested / Partial Coverage)</Text>
      {shown.map((cell) => (
        <View key={`${cell.account_category}-${cell.assertion_id}`} style={{ marginBottom: 6 }} wrap={false}>
          <Text style={styles.h3}>
            {fmtCategory(cell.account_category)} — {cell.assertion_id.replace(/_/g, " ")} ({cell.coverage_status})
          </Text>
          <View style={styles.gapDetailRow}>
            <Text style={styles.gapDetailLabel}>Evidence Strength</Text>
            <Text style={styles.gapDetailValue}>{cell.evidence_strength}</Text>
          </View>
          <View style={styles.gapDetailRow}>
            <Text style={styles.gapDetailLabel}>Covering Rules</Text>
            <Text style={styles.gapDetailValue}>{cell.covering_rule_ids.join(", ") || "—"}</Text>
          </View>
        </View>
      ))}
      {overflow > 0 && (
        <Text style={styles.attestPara}>{testedOverflowCopy(overflow)}</Text>
      )}
    </View>
  );
}

export function AssertionCoverageStatementDoc({
  statement,
}: {
  statement: AssertionCoverageStatement;
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Assertion Coverage Statement</Text>
        <Text style={styles.subtitle}>
          {statement.firm_client.name || "Client"} · Close period {statement.close_period.period_start} to{" "}
          {statement.close_period.period_end}
        </Text>
        <CoverStrip summary={statement.summary} />
        <Text style={styles.h2}>Coverage Matrix (18 categories × 8 assertions)</Text>
        <MatrixTable statement={statement} />
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <GapDetail statement={statement} />
        <TestedEvidence statement={statement} />
        <View style={{ marginTop: 20 }}>
          <Text style={styles.h2}>Attestation & Authoritative References</Text>
          <Text style={styles.attestPara}>{statement.attestation_footer.isa_315_citation}</Text>
          <Text style={styles.attestPara}>{statement.attestation_footer.pcaob_as_2301_citation}</Text>
          <Text style={styles.attestPara}>{statement.attestation_footer.pcaob_as_1105_citation}</Text>
          <Text style={styles.attestPara}>{statement.attestation_footer.pcaob_qc_1000_citation}</Text>
          <Text style={styles.citation}>{statement.attestation_footer.disclaimer}</Text>
        </View>
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

export async function generateAssertionCoverageStatementPdf(
  statement: AssertionCoverageStatement,
): Promise<{ buffer: Buffer; sha256: string; byteSize: number }> {
  const buf = await renderToBuffer(<AssertionCoverageStatementDoc statement={statement} />);
  const buffer = Buffer.from(buf);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return { buffer, sha256, byteSize: buffer.length };
}
