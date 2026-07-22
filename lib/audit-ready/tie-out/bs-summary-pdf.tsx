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
import { PDFDocument, PDFHexString, PDFString } from "pdf-lib";

const ACCENT = "#01696F";
const MUTED = "#666";
const BORDER = "#ddd";
const RED = "#A12C7B";
const GREEN = "#437A22";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 20, color: ACCENT, marginBottom: 4 },
  subtitle: { fontSize: 10, color: MUTED, marginBottom: 12 },
  h2: { fontSize: 12, color: ACCENT, marginTop: 10, marginBottom: 6 },
  countsRow: { flexDirection: "row", marginBottom: 10 },
  countCell: { flex: 1, fontSize: 9 },
  countLabel: { color: MUTED, fontSize: 8 },
  countValue: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    fontSize: 8,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 2,
    fontSize: 8,
  },
  c1: { flex: 3 }, // account name
  c2: { flex: 2 }, // type
  c3: { flex: 1.4, textAlign: "right" }, // ending
  c4: { flex: 1.4, textAlign: "right" }, // gl ending
  c5: { flex: 1.2, textAlign: "right" }, // variance
  c6: { flex: 1, textAlign: "right" }, // status
  equationBox: {
    marginTop: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  equationText: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 12, fontSize: 7, color: MUTED },
});

function usd(cents: number): string {
  const n = cents / 100;
  const s = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `($${s})` : `$${s}`;
}

export type BsSummaryPdfLine = {
  classification: "Asset" | "Liability" | "Equity";
  accountName: string;
  accountType: string;
  endingCents: number;
  glEndingCents: number;
  varianceCents: number;
  status: "tie" | "auto_reconcile" | "review" | "kickout" | "failed";
};

export type BsSummaryPdfInput = {
  engagementId: string;
  periodStart: string;
  periodEnd: string;
  lines: BsSummaryPdfLine[];
  assetsEndingCents: number;
  liabilitiesEndingCents: number;
  equityEndingCents: number;
  bsEquationVarianceCents: number;
  bsEquationStatus: "tie" | "kickout";
  accountCountTotal: number;
  accountCountTie: number;
  accountCountAutoReconcile: number;
  accountCountReview: number;
  accountCountKickout: number;
  accountCountFailed: number;
};

function group(
  lines: BsSummaryPdfLine[],
  cls: "Asset" | "Liability" | "Equity",
): BsSummaryPdfLine[] {
  return lines.filter((l) => l.classification === cls);
}

function statusLabel(s: BsSummaryPdfLine["status"]): string {
  if (s === "tie") return "TIE";
  if (s === "auto_reconcile") return "AUTO";
  if (s === "review") return "REVIEW";
  if (s === "kickout") return "KICKOUT";
  return "FAILED";
}

function statusColor(s: BsSummaryPdfLine["status"]): string {
  if (s === "tie" || s === "auto_reconcile") return GREEN;
  if (s === "review") return MUTED;
  return RED;
}

export async function renderBsSummaryPdf(
  input: BsSummaryPdfInput,
): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Balance Sheet Reconciliation Summary</Text>
        <Text style={styles.subtitle}>
          Engagement {input.engagementId} · Period {input.periodStart} through{" "}
          {input.periodEnd}
        </Text>
        <View style={styles.countsRow}>
          <View style={styles.countCell}>
            <Text style={styles.countLabel}>Accounts</Text>
            <Text style={styles.countValue}>{input.accountCountTotal}</Text>
          </View>
          <View style={styles.countCell}>
            <Text style={styles.countLabel}>Tie</Text>
            <Text style={styles.countValue}>{input.accountCountTie}</Text>
          </View>
          <View style={styles.countCell}>
            <Text style={styles.countLabel}>Auto</Text>
            <Text style={styles.countValue}>
              {input.accountCountAutoReconcile}
            </Text>
          </View>
          <View style={styles.countCell}>
            <Text style={styles.countLabel}>Review</Text>
            <Text style={styles.countValue}>{input.accountCountReview}</Text>
          </View>
          <View style={styles.countCell}>
            <Text style={styles.countLabel}>Kickout</Text>
            <Text style={styles.countValue}>{input.accountCountKickout}</Text>
          </View>
          <View style={styles.countCell}>
            <Text style={styles.countLabel}>Failed</Text>
            <Text style={styles.countValue}>{input.accountCountFailed}</Text>
          </View>
        </View>
        {(["Asset", "Liability", "Equity"] as const).map((cls) => {
          const rows = group(input.lines, cls);
          const total =
            cls === "Asset"
              ? input.assetsEndingCents
              : cls === "Liability"
                ? input.liabilitiesEndingCents
                : input.equityEndingCents;
          return (
            <View key={cls}>
              <Text style={styles.h2}>{cls}s</Text>
              <View style={styles.tableHeader}>
                <Text style={styles.c1}>Account</Text>
                <Text style={styles.c2}>Type</Text>
                <Text style={styles.c3}>Ending</Text>
                <Text style={styles.c4}>GL Ending</Text>
                <Text style={styles.c5}>Variance</Text>
                <Text style={styles.c6}>Status</Text>
              </View>
              {rows.length === 0 ? (
                <View style={styles.row}>
                  <Text style={styles.c1}>—</Text>
                  <Text style={styles.c2}>—</Text>
                  <Text style={styles.c3}>—</Text>
                  <Text style={styles.c4}>—</Text>
                  <Text style={styles.c5}>—</Text>
                  <Text style={styles.c6}>—</Text>
                </View>
              ) : (
                rows.map((r, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={styles.c1}>{r.accountName}</Text>
                    <Text style={styles.c2}>{r.accountType}</Text>
                    <Text style={styles.c3}>{usd(r.endingCents)}</Text>
                    <Text style={styles.c4}>{usd(r.glEndingCents)}</Text>
                    <Text style={styles.c5}>{usd(r.varianceCents)}</Text>
                    <Text style={{ ...styles.c6, color: statusColor(r.status) }}>
                      {statusLabel(r.status)}
                    </Text>
                  </View>
                ))
              )}
              <View style={{ ...styles.row, borderBottomWidth: 0 }}>
                <Text
                  style={{
                    ...styles.c1,
                    fontFamily: "Helvetica-Bold",
                    color: ACCENT,
                  }}
                >
                  Total {cls}s
                </Text>
                <Text style={styles.c2}></Text>
                <Text style={styles.c3}></Text>
                <Text style={{ ...styles.c4, fontFamily: "Helvetica-Bold" }}>
                  {usd(total)}
                </Text>
                <Text style={styles.c5}></Text>
                <Text style={styles.c6}></Text>
              </View>
            </View>
          );
        })}
        <View style={styles.equationBox}>
          <Text style={styles.equationText}>
            Assets {usd(input.assetsEndingCents)} = Liabilities{" "}
            {usd(input.liabilitiesEndingCents)} + Equity{" "}
            {usd(input.equityEndingCents)}
          </Text>
          <Text
            style={{
              ...styles.equationText,
              color: input.bsEquationStatus === "tie" ? GREEN : RED,
              marginTop: 4,
            }}
          >
            Variance {usd(input.bsEquationVarianceCents)} —{" "}
            {input.bsEquationStatus === "tie" ? "BALANCED" : "OUT OF BALANCE"}
          </Text>
        </View>
        {input.accountCountFailed > 0 && (
          <Text style={styles.footer}>
            {input.accountCountFailed} account(s) failed to reconcile and are
            excluded from the equation totals above. See individual account
            recon artifacts for detail.
          </Text>
        )}
      </Page>
    </Document>
  );
  const buf = await renderToBuffer(doc);
  // Deterministic post-processing — mirrors fa-rollforward-pdf (4B.2.4).
  const doc2 = await PDFDocument.load(buf, { updateMetadata: false });
  const epoch = new Date(0);
  doc2.setCreationDate(epoch);
  doc2.setModificationDate(epoch);
  for (const [ref, obj] of doc2.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFString)) continue;
    try {
      obj.decodeDate();
    } catch {
      continue;
    }
    doc2.context.assign(ref, PDFString.fromDate(epoch));
  }
  const placeholder = PDFHexString.of("00000000000000000000000000000000");
  doc2.context.trailerInfo.ID = doc2.context.obj([placeholder, placeholder]);
  const pass1 = await doc2.save({
    useObjectStreams: false,
    addDefaultPage: false,
  });
  const idHex = createHash("md5").update(pass1).digest("hex");
  const id = PDFHexString.of(idHex);
  doc2.context.trailerInfo.ID = doc2.context.obj([id, id]);
  const out = await doc2.save({
    useObjectStreams: false,
    addDefaultPage: false,
  });
  return Buffer.from(out);
}
