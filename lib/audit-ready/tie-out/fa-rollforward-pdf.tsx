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

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 20, color: ACCENT, marginBottom: 4 },
  subtitle: { fontSize: 10, color: MUTED, marginBottom: 12 },
  h2: { fontSize: 12, color: ACCENT, marginTop: 10, marginBottom: 6 },
  rfTable: { marginTop: 8, borderTopWidth: 1, borderTopColor: BORDER },
  rfRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 3,
  },
  rfCellLabel: { flex: 3, fontSize: 9 },
  rfCellNum: { flex: 2, fontSize: 9, textAlign: "right" },
  rfHeader: { fontFamily: "Helvetica-Bold", color: ACCENT },
  rfBold: { fontFamily: "Helvetica-Bold" },
  activityHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    fontSize: 8,
  },
  activityRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 2,
    fontSize: 8,
  },
  actC1: { flex: 1.2 },
  actC2: { flex: 1.8 },
  actC3: { flex: 2 },
  actC4: { flex: 1 },
  actC5: { flex: 1.2, textAlign: "right" },
});

function usd(cents: number): string {
  const n = cents / 100;
  const s = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `($${s})` : `$${s}`;
}

export type FaRollforwardPdfInput = {
  engagementId: string;
  periodStart: string;
  periodEnd: string;
  costBeg: number;
  costAdds: number;
  costDisp: number;
  costReclass: number;
  costEnd: number;
  costGlEnd: number;
  costVariance: number;
  accumBeg: number;
  accumDepr: number;
  accumDisp: number;
  accumReclass: number;
  accumEnd: number;
  accumGlEnd: number;
  accumVariance: number;
  nbvBeg: number;
  nbvEnd: number;
  costAccounts: Array<{ id: string; name: string; subType: string }>;
  accumAccounts: Array<{ id: string; name: string; subType: string }>;
  lines: Array<{
    side: "cost" | "accum";
    bucket: "addition" | "disposal" | "depreciation" | "reclass" | "other";
    txnDate: string;
    txnType: string;
    qboAccountName: string;
    signedCents: number;
  }>;
};

const ACTIVITY_ROW_CAP = 60;

export async function renderFaRollforwardPdf(
  input: FaRollforwardPdfInput,
): Promise<Buffer> {
  const activityShown = input.lines.slice(0, ACTIVITY_ROW_CAP);
  const activityOverflow = Math.max(0, input.lines.length - ACTIVITY_ROW_CAP);
  const doc = (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Fixed Asset Roll-Forward</Text>
        <Text style={styles.subtitle}>
          Period {input.periodStart} through {input.periodEnd} · Engagement{" "}
          {input.engagementId}
        </Text>

        <Text style={styles.h2}>Cost Roll-Forward</Text>
        <View style={styles.rfTable}>
          <View style={[styles.rfRow, styles.rfHeader]}>
            <Text style={styles.rfCellLabel}>Cost</Text>
            <Text style={styles.rfCellNum}>Amount</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>Beginning Balance</Text>
            <Text style={styles.rfCellNum}>{usd(input.costBeg)}</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>+ Additions</Text>
            <Text style={styles.rfCellNum}>{usd(input.costAdds)}</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>− Disposals</Text>
            <Text style={styles.rfCellNum}>{usd(-input.costDisp)}</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>± Reclass</Text>
            <Text style={styles.rfCellNum}>{usd(input.costReclass)}</Text>
          </View>
          <View style={[styles.rfRow, styles.rfBold]}>
            <Text style={styles.rfCellLabel}>= Ending Balance (activity)</Text>
            <Text style={styles.rfCellNum}>{usd(input.costEnd)}</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>Ending Balance (Trial Balance)</Text>
            <Text style={styles.rfCellNum}>{usd(input.costGlEnd)}</Text>
          </View>
          <View style={[styles.rfRow, styles.rfBold]}>
            <Text style={styles.rfCellLabel}>Variance</Text>
            <Text style={styles.rfCellNum}>{usd(input.costVariance)}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Accumulated Depreciation Roll-Forward</Text>
        <View style={styles.rfTable}>
          <View style={[styles.rfRow, styles.rfHeader]}>
            <Text style={styles.rfCellLabel}>
              Accumulated Depreciation (credit balance)
            </Text>
            <Text style={styles.rfCellNum}>Amount</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>Beginning Balance</Text>
            <Text style={styles.rfCellNum}>{usd(input.accumBeg)}</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>+ Depreciation Expense</Text>
            <Text style={styles.rfCellNum}>{usd(input.accumDepr)}</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>− Disposals</Text>
            <Text style={styles.rfCellNum}>{usd(-input.accumDisp)}</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>± Reclass</Text>
            <Text style={styles.rfCellNum}>{usd(input.accumReclass)}</Text>
          </View>
          <View style={[styles.rfRow, styles.rfBold]}>
            <Text style={styles.rfCellLabel}>= Ending Balance (activity)</Text>
            <Text style={styles.rfCellNum}>{usd(input.accumEnd)}</Text>
          </View>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>Ending Balance (Trial Balance)</Text>
            <Text style={styles.rfCellNum}>{usd(input.accumGlEnd)}</Text>
          </View>
          <View style={[styles.rfRow, styles.rfBold]}>
            <Text style={styles.rfCellLabel}>Variance</Text>
            <Text style={styles.rfCellNum}>{usd(input.accumVariance)}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Net Book Value</Text>
        <View style={styles.rfTable}>
          <View style={styles.rfRow}>
            <Text style={styles.rfCellLabel}>NBV Beginning</Text>
            <Text style={styles.rfCellNum}>{usd(input.nbvBeg)}</Text>
          </View>
          <View style={[styles.rfRow, styles.rfBold]}>
            <Text style={styles.rfCellLabel}>NBV Ending</Text>
            <Text style={styles.rfCellNum}>{usd(input.nbvEnd)}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Activity Detail (first {ACTIVITY_ROW_CAP})</Text>
        <View style={styles.activityHeader}>
          <Text style={styles.actC1}>Date</Text>
          <Text style={styles.actC2}>Txn Type</Text>
          <Text style={styles.actC3}>Account</Text>
          <Text style={styles.actC4}>Bucket</Text>
          <Text style={styles.actC5}>Signed</Text>
        </View>
        {activityShown.map((ln, i) => (
          <View key={i} style={styles.activityRow}>
            <Text style={styles.actC1}>{ln.txnDate}</Text>
            <Text style={styles.actC2}>{ln.txnType}</Text>
            <Text style={styles.actC3}>{ln.qboAccountName}</Text>
            <Text style={styles.actC4}>
              {ln.side}·{ln.bucket}
            </Text>
            <Text style={styles.actC5}>{usd(ln.signedCents)}</Text>
          </View>
        ))}
        {activityOverflow > 0 && (
          <Text style={{ fontSize: 8, color: MUTED, marginTop: 6 }}>
            … {activityOverflow} additional activity rows not shown in this PDF
            summary.
          </Text>
        )}
      </Page>
    </Document>
  );
  const buf = await renderToBuffer(doc);
  // Post-process to eliminate wall-clock timestamps so identical input
  // hashes to identical bytes across runs (audit-grade reproducibility).
  // react-pdf embeds /CreationDate as an indirect string object plus a
  // timestamp-derived trailer /ID. pdf-lib's setCreationDate replaces the
  // Info dict entry with an inline epoch string but leaves the old indirect
  // date object in the body and preserves the random /ID — both must be
  // normalized explicitly for byte-stable output.
  const doc2 = await PDFDocument.load(buf, { updateMetadata: false });
  const epoch = new Date(0); // 1970-01-01T00:00:00Z
  doc2.setCreationDate(epoch);
  doc2.setModificationDate(epoch);
  // Producer/Creator are already fixed strings from react-pdf; leave them.
  for (const [ref, obj] of doc2.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFString)) continue;
    try {
      obj.decodeDate();
    } catch {
      continue;
    }
    doc2.context.assign(ref, PDFString.fromDate(epoch));
  }
  // pdf-lib does not content-hash /ID on save — it keeps the loaded trailer
  // ID. Two-pass: serialize with a fixed placeholder, then stamp an MD5 of
  // that buffer as the permanent /ID and re-serialize.
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
