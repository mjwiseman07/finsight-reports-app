import React from "react";
import { Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { formatIsoDate, humanKindLabel } from "./format";

const ACCENT = "#01696F";
const MUTED = "#666";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 18, color: ACCENT, marginBottom: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 120, color: MUTED },
  value: { flex: 1 },
  sig: { marginTop: 28 },
  footer: { marginTop: 40, fontSize: 8, color: MUTED },
});

export function PdfCover({ face }: { face: ReconFaceSpec }) {
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.title}>{humanKindLabel(face.tieOutKind)}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Engagement</Text>
        <Text style={styles.value}>{face.engagementName}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Period End</Text>
        <Text style={styles.value}>{formatIsoDate(face.periodEnd)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Kind</Text>
        <Text style={styles.value}>{face.tieOutKind}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Run ID</Text>
        <Text style={styles.value}>{face.runId}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Generated</Text>
        <Text style={styles.value}>{face.generatedAt}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>
          {face.tieStatus === "ties" ? "TIES" : "KICKOUT"}
        </Text>
      </View>
      <View style={styles.sig}>
        <Text>Prepared by: ______________________  Date: __________</Text>
        <Text style={{ marginTop: 12 }}>
          Reviewed by: ______________________  Date: __________
        </Text>
      </View>
      <Text style={styles.footer}>Prepared by Advisacor</Text>
    </Page>
  );
}
