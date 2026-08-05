/**
 * Block 7 — AR-scoped assertion coverage PDF.
 *
 * AR chrome tokens per Block 7 D7 (charcoal + gold, not Nexus).
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
import type {
  PilotLifecycleCoverageOverlay,
  LifecycleEvidenceGroup,
} from "../coverage-overlay";

const AR_BG = "#111112";
const AR_TEXT = "#ECEBE7";
const AR_MUTED = "#A29E93";
const AR_GOLD = "#C9A961";
const AR_CARD = "#1A1A1C";

const styles = StyleSheet.create({
  coverPage: {
    padding: 48,
    backgroundColor: AR_BG,
    color: AR_TEXT,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: AR_TEXT,
    marginBottom: 6,
  },
  coverGoldRule: {
    marginTop: 8,
    marginBottom: 18,
    height: 2,
    backgroundColor: AR_GOLD,
    width: 60,
  },
  coverMeta: { fontSize: 10, color: AR_MUTED, marginBottom: 3 },
  coverMetaValue: { color: AR_TEXT },
  coverSummaryRow: { flexDirection: "row", marginTop: 30 },
  coverTile: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    backgroundColor: AR_CARD,
    borderLeftWidth: 2,
    borderLeftColor: AR_GOLD,
  },
  coverTileLabel: { fontSize: 8, color: AR_MUTED, marginBottom: 4 },
  coverTileValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: AR_TEXT,
  },
  coverAttest: {
    marginTop: 40,
    fontSize: 8,
    color: AR_MUTED,
    lineHeight: 1.5,
  },
  section: {
    padding: 40,
    backgroundColor: AR_BG,
    color: AR_TEXT,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: AR_TEXT,
    marginBottom: 4,
  },
  sectionGoldRule: {
    marginTop: 4,
    marginBottom: 14,
    height: 1,
    backgroundColor: AR_GOLD,
    width: 40,
  },
  groupCard: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: AR_CARD,
    borderLeftWidth: 2,
    borderLeftColor: AR_GOLD,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  groupAssertion: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: AR_TEXT,
  },
  groupHint: {
    fontSize: 8,
    color: AR_GOLD,
    fontFamily: "Helvetica-Bold",
  },
  groupMeta: { fontSize: 8, color: AR_MUTED, marginBottom: 2 },
  groupIsa: { fontSize: 8, color: AR_MUTED, marginBottom: 4 },
  refBlock: {
    marginTop: 6,
    padding: 6,
    backgroundColor: "#000000",
    fontFamily: "Courier",
    fontSize: 7,
    color: AR_MUTED,
  },
  warningCard: {
    marginBottom: 6,
    padding: 8,
    backgroundColor: AR_CARD,
    borderLeftWidth: 2,
    borderLeftColor: "#DD6974",
  },
  warningLine: { fontSize: 8, color: AR_TEXT, marginBottom: 2 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 7,
    color: AR_MUTED,
    borderTopWidth: 0.5,
    borderTopColor: AR_MUTED,
    paddingTop: 4,
  },
  emptyState: {
    fontSize: 10,
    color: AR_MUTED,
    fontStyle: "italic",
    marginTop: 12,
  },
});

const PCAOB_LABEL: Record<string, string> = {
  existence: "Existence",
  completeness: "Completeness",
  accuracy: "Accuracy",
  valuation: "Valuation",
  rights_obligations: "Rights & Obligations",
  presentation_disclosure: "Presentation & Disclosure",
};

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function EvidenceGroupCard({ group }: { group: LifecycleEvidenceGroup }) {
  const hintLabel = group.classification_hint
    ? truncate(group.classification_hint, 40)
    : "—";
  return (
    <View style={styles.groupCard} wrap={false}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupAssertion}>
          {PCAOB_LABEL[group.pcaob_assertion] ?? group.pcaob_assertion}
        </Text>
        <Text style={styles.groupHint}>{hintLabel}</Text>
      </View>
      <Text style={styles.groupIsa}>
        ISA-315 cells: {group.isa_assertion_ids.join(" · ")}
      </Text>
      <Text style={styles.groupMeta}>
        Events: {group.event_count} · First:{" "}
        {group.first_event_at.slice(0, 10)} · Last:{" "}
        {group.last_event_at.slice(0, 10)}
      </Text>
      {group.sample_evidence_refs.length > 0 ? (
        <View style={styles.refBlock}>
          <Text>
            Evidence refs (up to 3):{" "}
            {JSON.stringify(group.sample_evidence_refs)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export type AuditReadyCoveragePdfInput = {
  engagement: {
    id: string;
    company_id: string | null;
    firm_id: string | null;
    firm_client_name: string | null;
    period_label: string;
  };
  overlay: PilotLifecycleCoverageOverlay;
  chain: {
    verified_at: string;
    is_intact: boolean;
    break_count: number;
  };
};

export function AuditReadyCoverageDoc({
  input,
}: {
  input: AuditReadyCoveragePdfInput;
}) {
  const { engagement, overlay, chain } = input;
  return (
    <Document>
      <Page size="LETTER" style={styles.coverPage}>
        <Text style={styles.coverTitle}>Assertion Coverage Statement</Text>
        <View style={styles.coverGoldRule} />
        <Text style={styles.coverMeta}>
          Client:{" "}
          <Text style={styles.coverMetaValue}>
            {engagement.firm_client_name ?? "—"}
          </Text>
        </Text>
        <Text style={styles.coverMeta}>
          Engagement:{" "}
          <Text style={styles.coverMetaValue}>{engagement.id}</Text>
        </Text>
        <Text style={styles.coverMeta}>
          Period:{" "}
          <Text style={styles.coverMetaValue}>{engagement.period_label}</Text>
        </Text>
        <Text style={styles.coverMeta}>
          Generated:{" "}
          <Text style={styles.coverMetaValue}>{overlay.generated_at}</Text>
        </Text>
        <Text style={styles.coverMeta}>
          Chain verified:{" "}
          <Text style={styles.coverMetaValue}>
            {chain.is_intact ? "INTACT" : `${chain.break_count} BREAK(S)`} at{" "}
            {chain.verified_at}
          </Text>
        </Text>

        <View style={styles.coverSummaryRow}>
          <View style={styles.coverTile}>
            <Text style={styles.coverTileLabel}>Evidence Events</Text>
            <Text style={styles.coverTileValue}>
              {overlay.total_evidence_events}
            </Text>
          </View>
          <View style={styles.coverTile}>
            <Text style={styles.coverTileLabel}>PCAOB-6 Covered</Text>
            <Text style={styles.coverTileValue}>
              {overlay.distinct_pcaob_assertions} / 6
            </Text>
          </View>
          <View style={styles.coverTile}>
            <Text style={styles.coverTileLabel}>Classification Hints</Text>
            <Text style={styles.coverTileValue}>
              {overlay.distinct_classification_hints}
            </Text>
          </View>
          <View style={styles.coverTile}>
            <Text style={styles.coverTileLabel}>Warnings</Text>
            <Text style={styles.coverTileValue}>{overlay.warnings.length}</Text>
          </View>
        </View>

        <Text style={styles.coverAttest}>
          This document reflects the tamper-evident pilot lifecycle event chain
          maintained by Advisacor{"'"}s audit-ready platform (Blocks 1-6). Each
          Evidence Event is hashed, linked to its predecessor via a
          canonical-payload sha256 chain, and independently verifiable via
          Advisacor{"'"}s client-side chain verifier. Coverage designations align
          with the PCAOB-6 taxonomy (AS 2401) mapped to the ISA-315 8-assertion
          breakdown.
        </Text>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>

      <Page size="LETTER" style={styles.section}>
        <Text style={styles.sectionTitle}>Live Evidence Chain</Text>
        <View style={styles.sectionGoldRule} />

        {overlay.groups.length === 0 ? (
          <Text style={styles.emptyState}>
            No lifecycle evidence events found for this engagement partition.
          </Text>
        ) : (
          overlay.groups.map((g) => (
            <EvidenceGroupCard
              key={`${g.pcaob_assertion}-${g.classification_hint ?? "_"}`}
              group={g}
            />
          ))
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>

      {overlay.warnings.length > 0 ? (
        <Page size="LETTER" style={styles.section}>
          <Text style={styles.sectionTitle}>Reconciliation Warnings</Text>
          <View style={styles.sectionGoldRule} />
          {overlay.warnings.slice(0, 60).map((w, i) => (
            <View
              key={`${w.event_id}-${i}`}
              style={styles.warningCard}
              wrap={false}
            >
              <Text style={styles.warningLine}>
                Event {w.event_id.slice(0, 8)} · {w.event_at} · reason:{" "}
                {w.reason}
              </Text>
              <Text style={[styles.warningLine, { color: AR_MUTED }]}>
                {w.detail}
              </Text>
            </View>
          ))}
          {overlay.warnings.length > 60 ? (
            <Text style={styles.emptyState}>
              … {overlay.warnings.length - 60} additional warnings not shown.
            </Text>
          ) : null}
          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
            fixed
          />
        </Page>
      ) : null}
    </Document>
  );
}

export async function generateAuditReadyCoveragePdf(
  input: AuditReadyCoveragePdfInput,
): Promise<{ buffer: Buffer; sha256: string; byteSize: number }> {
  const raw = await renderToBuffer(<AuditReadyCoverageDoc input={input} />);
  const buffer = Buffer.from(raw);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return { buffer, sha256, byteSize: buffer.length };
}
