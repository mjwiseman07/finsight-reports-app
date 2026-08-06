/**
 * lib/platform-integrity/copy.ts
 *
 * MAJOR #2.3 Block B.4 — Centralized user-visible copy for the Platform
 * Integrity surface. Every string that renders to a customer lives here.
 *
 * Version bump on every edit. PR reviewers must diff this file against the
 * shipped version to see any copy delta cleanly.
 *
 * Every string in this file traces to either:
 *  - The static research MD at public/research/schema_drift_assertion_mapping_research.md, or
 *  - A specific framework citation resolved server-side in lib/platform-integrity/citations.ts
 *
 * Adding a string without a research/citation trace is a Rule 4 violation.
 */

export const COPY_VERSION = "1.0.0" as const;

export const platformIntegrityCopy = {
  // ─── Deep page (/dashboard/platform-integrity) ─────────────────────────
  page: {
    title: "Platform Integrity",
    subtitle:
      "Contingent risk indicators derived from your ledger schema and lifecycle memory",
    // Disclosure paragraph — PERMANENT + non-dismissible per B.2 design.
    // Sourced from research MD contingent-risk framing + ISA 315 A150 discipline.
    disclosure:
      "These indicators surface conditions that MAY require attention under a specific reporting framework. Each finding requires professional judgment to confirm relevance. Absence of a finding is not assurance; presence is not a determination.",
    emptyStateHeadline: "No contingent risk indicators detected",
    emptyStateBody:
      "The lifecycle memory chain reports no framework-grounded indicators at this time. This is a point-in-time snapshot; the surface refreshes on each ledger change event.",
    loadingLabel: "Loading platform integrity signals…",
    errorHeadline: "Unable to load signals",
    errorBody:
      "The Platform Integrity API is temporarily unreachable. This does not affect ledger operations.",
    disabledHeadline: "Platform Integrity",
    disabledBody:
      "This surface is not yet enabled in your workspace. Contact support to learn more.",
    confidenceFilterLabel: "Confidence",
    filterAll: "All",
    filterGrounded: "Framework-grounded",
    filterFrameworkDefinition: "Framework-definition minimum",
    filterJudgmentRequired: "Auditor judgment required",
    filterUnknown: "Requires review",
    viewMethodologyCta: "View methodology",
    noFilterMatch: "No findings match the current filter.",
  },

  // ─── Chain status ───────────────────────────────────────────────────────
  chain: {
    intactLabel: "Chain intact",
    intactDescription:
      "The lifecycle memory hash chain is contiguous and tamper-evident through the most recent event.",
    gapLabelSingular: "1 chain gap",
    gapLabelPlural: (n: number) => `${n} chain gaps`,
    gapDescription:
      "One or more expected sequence entries are missing from the lifecycle memory hash chain. Under a tamper-evident model this warrants investigation before relying on affected findings.",
  },

  // ─── Finding / chip labels ─────────────────────────────────────────────
  finding: {
    confidenceGrounded: "Framework-grounded",
    confidenceJudgmentRequired: "Judgment required",
    confidenceFrameworkFallback: "Framework-definition minimum",
    confidenceUnknown: "Requires review",
    confidenceGroundedFull:
      "Direct textual grounding in ISA 315 Para A190(a)(i)-(iii). See methodology.",
    confidenceFrameworkFull:
      "Grounded in ISA 315 Para 12(d)/(i) definition of information integrity: completeness + accuracy + validity. See methodology.",
    confidenceJudgmentFull:
      "Table linkage supported by literature but the specific assertion determination requires auditor judgment against account and materiality per ISA 315 Appendix 5 §19 and KPMG Q3.4.20. See methodology.",
    confidenceUnknownFull:
      "Confidence cannot be determined without additional context. See methodology.",
    relevanceInScope: "Financial reporting relevant",
    relevanceScopePending: "Scope pending review",
    relevanceOutOfScope: "Outside financial reporting scope",
    relevanceInScopeFull:
      "Table feeds financial-statement-relevant accounts per ISA 315 Para 12(g)(i) and KPMG Handbook Q3.4.20 materiality gate.",
    relevancePendingFull:
      "Financial reporting relevance not determined. Per ISA 315 Appendix 5 §19, this determination requires materiality analysis.",
    relevanceOutFull:
      "Table does not feed financial-statement-relevant accounts. Per ISA 315 Appendix 5 §19, such drift may not affect financial reporting.",
    assertionRiskEyebrow: "Contingent assertion risk indicators",
    citationCtaLabel: "Methodology",
    citationSourceLabelPrefix: "Source: ",
  },

  // ─── Methodology drawer + public methodology page ──────────────────────
  methodology: {
    drawerTitle: "Methodology",
    drawerSubtitle:
      "How Advisacor derives contingent risk indicators from ledger schema and lifecycle memory",
    publicPageTitle: "Platform Integrity Methodology",
    publicPageSubtitle:
      "Advisacor's approach to deriving contingent risk indicators from ledger schema drift and lifecycle memory tamper-evidence",
    publicPageMetaDescription:
      "Advisacor's Platform Integrity methodology: how we map QuickBooks schema drift and lifecycle memory chain state to ISA 315, COBIT, and KPMG assertion frameworks to surface contingent risk indicators.",
    researchDocLastUpdatedLabel: "Research file version",
    loadingLabel: "Loading methodology…",
    primarySourcesEyebrow: "Primary sources",
    closeLabel: "Close",
  },

  // ─── Dashboard KPI tile (in-file helper from B.3) ──────────────────────
  kpiTile: {
    eyebrow: "Platform Integrity",
    unitSingular: "contingent risk indicator",
    unitPlural: "contingent risk indicators",
    highSignalSuffix: "framework-grounded · in scope",
    highSignalEmpty: "None framework-grounded + in scope",
    cta: "View surface →",
    loading: "Loading…",
    error: "Unable to load signals",
  },

  // ─── Pulse Advisory read-through row (from B.3) ────────────────────────
  pulseRow: {
    title: "Data Integrity",
    empty: "No data-integrity findings detected",
    loading: "Loading signals…",
    error: "Unable to load signals",
    counts: (total: number, grounded: number, judgment: number) =>
      `${total} indicator${total === 1 ? "" : "s"} · ${grounded} grounded · ${judgment} judgment`,
    openCta: "Open",
  },

  // ─── Header nav entry (from B.3) ───────────────────────────────────────
  headerNav: {
    label: "Platform Integrity",
  },
};

export type PlatformIntegrityCopy = typeof platformIntegrityCopy;
