import React from "react";
import { Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { centsToUsd, formatIsoDate } from "./format";

const ACCENT = "#01696F";
const MUTED = "#666";
const BORDER = "#ddd";
const GREEN = "#437A22";
const RED = "#A12C7B";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 14, color: ACCENT, marginBottom: 8 },
  subtitle: { fontSize: 9, color: MUTED, marginBottom: 12 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 4,
  },
  label: { flex: 3 },
  num: { flex: 2, textAlign: "right" },
  badge: { marginTop: 10, marginBottom: 12, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 11, color: ACCENT, marginTop: 8, marginBottom: 4 },
  header: { fontFamily: "Helvetica-Bold", color: ACCENT },
});

export function PdfFace({ face }: { face: ReconFaceSpec }) {
  const badgeColor = face.tieStatus === "ties" ? GREEN : RED;
  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.title}>Reconciliation Face</Text>
      <Text style={styles.subtitle}>
        {face.engagementName} · Period {formatIsoDate(face.periodEnd)}
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Per {face.leftLabel}</Text>
        <Text style={styles.num}>{centsToUsd(face.leftAmountCents)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Per {face.rightLabel}</Text>
        <Text style={styles.num}>{centsToUsd(face.rightAmountCents)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { fontFamily: "Helvetica-Bold" }]}>
          Variance
        </Text>
        <Text style={[styles.num, { fontFamily: "Helvetica-Bold" }]}>
          {centsToUsd(face.varianceCents)}
        </Text>
      </View>
      <Text style={[styles.badge, { color: badgeColor }]}>
        {face.tieStatus === "ties" ? "TIES" : "KICKOUT"}
      </Text>
      <Text style={styles.h2}>Sections</Text>
      <View style={[styles.row, styles.header]}>
        <Text style={styles.label}>Section</Text>
        <Text style={styles.num}>Amount</Text>
        <Text style={{ flex: 2 }}>Backup Tab</Text>
      </View>
      {face.sections.map((s, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{s.label}</Text>
          <Text style={styles.num}>{centsToUsd(s.amountCents)}</Text>
          <Text style={{ flex: 2 }}>{s.backupTabName}</Text>
        </View>
      ))}
    </Page>
  );
}
