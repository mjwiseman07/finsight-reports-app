/**
 * D6.4d — Review-item PDF packet generator (@react-pdf/renderer).
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
import type { ReviewItemDetail } from "@/lib/pre-close/reviewer-types";
import type { JEDraft, JEDraftLine } from "@/lib/pre-close/types";

const ACCENT = "#01696F";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  coverTitle: { fontSize: 24, color: ACCENT, marginBottom: 16 },
  sectionHeader: { fontSize: 14, color: ACCENT, marginTop: 14, marginBottom: 6 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 140, color: "#555" },
  value: { flex: 1 },
  mono: { fontFamily: "Courier", fontSize: 8, marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: "bold",
  },
  tableRow: { flexDirection: "row", marginBottom: 2 },
  colAccount: { width: "25%" },
  colName: { width: "30%" },
  colDr: { width: "22%", textAlign: "right" },
  colCr: { width: "22%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#888",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export interface GenerateReviewItemPacketOptions {
  detail: ReviewItemDetail;
  exportedByEmail: string;
  exportedAt?: Date;
  sha256?: string;
}

function cents(n: number): string {
  return (n / 100).toFixed(2);
}

function DraftTable({ draft, title }: { draft: JEDraft; title: string }) {
  const totalDr = draft.lines.reduce((s, l) => s + l.drAmountCents, 0);
  const totalCr = draft.lines.reduce((s, l) => s + l.crAmountCents, 0);
  return (
    <View>
      <Text style={styles.sectionHeader}>{title}</Text>
      <Text>Narration: {draft.narration}</Text>
      <Text>Transaction date: {draft.transactionDate}</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.colAccount}>Account</Text>
        <Text style={styles.colName}>Name</Text>
        <Text style={styles.colDr}>Debit</Text>
        <Text style={styles.colCr}>Credit</Text>
      </View>
      {draft.lines.map((line: JEDraftLine) => (
        <View key={line.lineIndex} style={styles.tableRow}>
          <Text style={styles.colAccount}>{line.accountId}</Text>
          <Text style={styles.colName}>{line.accountName}</Text>
          <Text style={styles.colDr}>{line.drAmountCents ? cents(line.drAmountCents) : ""}</Text>
          <Text style={styles.colCr}>{line.crAmountCents ? cents(line.crAmountCents) : ""}</Text>
        </View>
      ))}
      <View style={styles.tableRow}>
        <Text style={styles.colAccount}>Totals</Text>
        <Text style={styles.colName} />
        <Text style={styles.colDr}>{cents(totalDr)}</Text>
        <Text style={styles.colCr}>{cents(totalCr)}</Text>
      </View>
    </View>
  );
}

function ReviewItemPacketDocument({ opts }: { opts: GenerateReviewItemPacketOptions }) {
  const { detail, exportedByEmail, exportedAt = new Date(), sha256 = "" } = opts;
  const evidenceText = JSON.stringify(detail.evidenceRefs, null, 2);

  return (
    <Document title={`Review Item ${detail.id}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>Review Item Packet</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>{detail.firmClientName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Engagement</Text>
          <Text style={styles.value}>{detail.engagementName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Close period</Text>
          <Text style={styles.value}>{detail.closePeriodId ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Review item ID</Text>
          <Text style={styles.value}>{detail.id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Exported by</Text>
          <Text style={styles.value}>{exportedByEmail}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Generated at</Text>
          <Text style={styles.value}>{exportedAt.toISOString()}</Text>
        </View>

        <Text style={styles.sectionHeader}>Rule fire</Text>
        <Text>
          {detail.ruleId} v{detail.ruleVersion} — {detail.severity} — {detail.ruleReasonCode}
        </Text>
        {detail.ruleReasonDetail ? <Text>{detail.ruleReasonDetail}</Text> : null}
        <Text style={styles.mono}>{evidenceText}</Text>

        {detail.basisGuardReasonCode ? (
          <View>
            <Text style={styles.sectionHeader}>Basis guard</Text>
            <Text>
              {detail.basisGuardReasonCode}: {detail.basisGuardReasonText ?? ""}
            </Text>
          </View>
        ) : null}

        <DraftTable draft={detail.jeDraft} title="JE draft" />
        {detail.editedJeDraft ? (
          <DraftTable draft={detail.editedJeDraft} title="Edited JE draft" />
        ) : null}

        <Text style={styles.sectionHeader}>Decision</Text>
        <Text>
          {detail.decision ?? "pending"} — {detail.decisionReasonCode ?? ""}{" "}
          {detail.decisionReasonText ?? ""}
        </Text>
        <Text>Reviewer: {detail.reviewerUserId ?? "—"} at {detail.decisionAt ?? "—"}</Text>

        <Text style={styles.sectionHeader}>Posting</Text>
        <Text>Attempt: {detail.postedJeAttemptId ?? "—"}</Text>
        <Text>QBO JE: {detail.qboJeId ?? "—"}</Text>
        <Text>Block reason: {detail.postBlockReason ?? "—"}</Text>
        {detail.remediationLog.length === 0 ? null : (
          <>
            {detail.remediationLog.map((e, i) => (
              <Text key={i}>
                • [{e.timestamp}] {e.category}: {e.inputSummary} → {e.outputSummary}
              </Text>
            ))}
          </>
        )}

        <Text style={styles.sectionHeader}>Ledger events</Text>
        {detail.postingLedgerEvents.length === 0 ? null : (
          <>
            {detail.postingLedgerEvents.map((e) => (
              <Text key={e.eventId}>
                [{e.createdAt}] {e.eventType} ({e.eventCategory})
              </Text>
            ))}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>Review Item {detail.id}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          <Text>{sha256 ? sha256.slice(0, 16) : ""}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function sha256OfReviewItemPacket(
  opts: GenerateReviewItemPacketOptions,
): Promise<{ buffer: Buffer; sha256: string }> {
  const buffer = Buffer.from(await renderToBuffer(<ReviewItemPacketDocument opts={opts} />));
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return { buffer, sha256 };
}

export async function generateReviewItemPacketBuffer(
  opts: GenerateReviewItemPacketOptions,
): Promise<Buffer> {
  const { buffer } = await sha256OfReviewItemPacket(opts);
  return buffer;
}

export async function generateReviewItemPacketStream(
  opts: GenerateReviewItemPacketOptions,
): Promise<NodeJS.ReadableStream> {
  const { buffer } = await sha256OfReviewItemPacket(opts);
  const { Readable } = await import("node:stream");
  return Readable.from(buffer);
}
