export type SyntheticCommandCenterSurfaceCategory =
  | "executive_briefing"
  | "decision_queue"
  | "watchlist"
  | "firm_portfolio"
  | "client_portfolio"
  | "close_command"
  | "controller_command"
  | "cash_command"
  | "workforce_command"
  | "tax_compatibility"
  | "relationship_intelligence"
  | "data_quality"
  | "integration_health"
  | "benchmark_intelligence"
  | "onboarding";

export type SyntheticCommandCenterIntelligenceSourceCategory =
  | "forecasting"
  | "scenario_modeling"
  | "recommendations"
  | "commentary"
  | "company_memory"
  | "evidence_store"
  | "confidence_scoring"
  | "signal_engine"
  | "metric_series"
  | "historical_snapshots"
  | "industry_profiles"
  | "manual_review";

export type SyntheticCommandCenterDecisionSurfaceCategory =
  | "single_pane_summary"
  | "executive_attention"
  | "decision_required"
  | "monitoring"
  | "risk_review"
  | "approval_review"
  | "board_preparation"
  | "meeting_preparation"
  | "client_advisory"
  | "firm_management";

export type SyntheticCommandCenterAttentionCategory =
  | "critical_attention"
  | "executive_review"
  | "manager_review"
  | "monitor"
  | "informational"
  | "deferred";

export type SyntheticCommandCenterPriorityLevel =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational";

export type SyntheticCommandCenterRoleCategory =
  | "executive"
  | "cfo"
  | "controller"
  | "accounting_manager"
  | "firm_owner"
  | "firm_manager"
  | "client_owner"
  | "advisor"
  | "board"
  | "operations"
  | "tax"
  | "admin";

export type SyntheticCommandCenterBriefingCategory =
  | "daily_briefing"
  | "weekly_briefing"
  | "monthly_briefing"
  | "board_briefing"
  | "meeting_briefing"
  | "event_driven_briefing"
  | "firm_manager_briefing"
  | "client_owner_briefing";

export type SyntheticCommandCenterCadenceCategory =
  | "real_time"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "event_driven"
  | "on_demand";

export type SyntheticCommandCenterTrustCategory =
  | "trusted"
  | "needs_review"
  | "degraded"
  | "blocked"
  | "unknown";

export type SyntheticCommandCenterConfidenceCategory =
  | "high_confidence"
  | "medium_confidence"
  | "low_confidence"
  | "insufficient_evidence"
  | "unknown";

export type SyntheticCommandCenterDegradationCategory =
  | "none"
  | "partial_data"
  | "stale_data"
  | "conflicting_evidence"
  | "permission_limited"
  | "source_unavailable"
  | "not_applicable";

export type SyntheticCommandCenterGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "retired"
  | "not_required";

export type SyntheticCommandCenterRoutingCategory =
  | "primary_surface"
  | "secondary_surface"
  | "drill_down"
  | "briefing"
  | "watchlist"
  | "decision_queue"
  | "portfolio_view"
  | "governance_review";

export type SyntheticCommandCenterValidationStatus =
  | "not_evaluated"
  | "valid"
  | "needs_review"
  | "invalid"
  | "not_applicable";

export type SyntheticCommandCenterScopeLevel =
  | "company"
  | "firm"
  | "client"
  | "firm_portfolio"
  | "client_portfolio"
  | "user"
  | "role";

export type SyntheticCommandCenterCashReconciliationHealthCategory =
  | "excellent"
  | "good"
  | "watch"
  | "needs_attention"
  | "critical";

export interface SyntheticCommandCenterVersionMetadata {
  schemaVersion: number;
  taxonomyVersion: number;
  contractVersion: number;
  compatibilityVersion: number;
}

export interface SyntheticCommandCenterScope {
  scopeLevel: SyntheticCommandCenterScopeLevel;
  companyId: string;
  firmId?: string;
  clientId?: string;
  portfolioId?: string;
  entityId?: string;
  userId?: string;
  roleCategory?: SyntheticCommandCenterRoleCategory;
  clientIsolationRequired: boolean;
  clientScopeIds: string[];
}

export interface SyntheticCommandCenterPriority {
  priorityLevel: SyntheticCommandCenterPriorityLevel;
  attentionCategory: SyntheticCommandCenterAttentionCategory;
  attentionRequired: boolean;
  priorityReason?: string;
}

export type SyntheticCommandCenterPriorityMetadata = SyntheticCommandCenterPriority;

export interface SyntheticCommandCenterMetadata {
  commandCenterItemId: string;
  companyId: string;
  surfaceCategory: SyntheticCommandCenterSurfaceCategory;
  intelligenceSourceCategory: SyntheticCommandCenterIntelligenceSourceCategory;
  decisionSurfaceCategory: SyntheticCommandCenterDecisionSurfaceCategory;
  briefingCategory?: SyntheticCommandCenterBriefingCategory;
  cadenceCategory?: SyntheticCommandCenterCadenceCategory;
  routingCategory?: SyntheticCommandCenterRoutingCategory;
  governanceStatus: SyntheticCommandCenterGovernanceStatus;
  trustCategory: SyntheticCommandCenterTrustCategory;
  confidenceCategory: SyntheticCommandCenterConfidenceCategory;
  degradationCategory: SyntheticCommandCenterDegradationCategory;
  version: SyntheticCommandCenterVersionMetadata;
}

export interface SyntheticCommandCenterRoleCompatibility {
  primaryRoleCategories: SyntheticCommandCenterRoleCategory[];
  secondaryRoleCategories: SyntheticCommandCenterRoleCategory[];
  excludedRoleCategories: SyntheticCommandCenterRoleCategory[];
  requiresHumanReview: boolean;
  governanceStatus: SyntheticCommandCenterGovernanceStatus;
}

export interface SyntheticCommandCenterSurface {
  primarySurfaceCategory: SyntheticCommandCenterSurfaceCategory;
  compatibleSurfaceCategories: SyntheticCommandCenterSurfaceCategory[];
  decisionSurfaceCategories: SyntheticCommandCenterDecisionSurfaceCategory[];
  routingCategories: SyntheticCommandCenterRoutingCategory[];
  supportsSinglePaneSummary: boolean;
  supportsDrillDownReference: boolean;
}

export type SyntheticCommandCenterSurfaceCompatibility = SyntheticCommandCenterSurface;

export interface SyntheticCommandCenterValidationMetadata {
  validationStatus: SyntheticCommandCenterValidationStatus;
  validationReason?: string;
  requiredMetadataFields: string[];
  missingMetadataFields: string[];
  warningCodes: string[];
}

export interface SyntheticCommandCenterCashReconciliationAgingCompatibility {
  cashReconciliationItemIds: string[];
  cashReconciliationAccountIds: string[];
  cashReconciliationAgeDays?: number;
  cashReconciliationStatus?: string;
  oldestCashReconcilingItemDate?: string;
  staleCashReconcilingItemCount?: number;
  staleCashReconcilingItemAmount?: number;
  cashReconciliationRiskScore?: number;
  cashReconciliationHealthScore?: number;
  cashReconciliationHealthCategory?: SyntheticCommandCenterCashReconciliationHealthCategory;
  cashReconciliationAttentionRequired?: boolean;
  cashReconciliationEvidenceIds: string[];
  firmPortfolioCompatible: boolean;
  clientIsolationRequired: boolean;
}

export interface SyntheticCommandCenterLineage {
  commandCenterItemId: string;
  sourceReferenceIds: string[];
  evidenceIds: string[];
  supportingForecastIds: string[];
  supportingScenarioIds: string[];
  supportingRecommendationIds: string[];
  supportingCommentaryIds: string[];
  supportingMemoryIds: string[];
  supportingSignalIds: string[];
  supportingMetricSeriesIds: string[];
  supportingSnapshotIds: string[];
  supportingIndustryProfileIds: string[];
}

export interface SyntheticCommandCenterEvidence {
  evidenceIds: string[];
  sourceReferenceIds: string[];
  supportingIntelligenceIds: string[];
  supportingForecastIds: string[];
  supportingScenarioIds: string[];
  supportingRecommendationIds: string[];
  supportingCommentaryIds: string[];
  supportingMemoryIds: string[];
  supportingSignalIds: string[];
  supportingMetricSeriesIds: string[];
  supportingSnapshotIds: string[];
  supportingIndustryProfileIds: string[];
  lineage: SyntheticCommandCenterLineage;
}

export interface SyntheticCommandCenterTrustMetadata {
  trustCategory: SyntheticCommandCenterTrustCategory;
  trustReason?: string;
  trustSourceReferenceIds: string[];
  trustEvidenceIds: string[];
  trustGovernanceStatus: SyntheticCommandCenterGovernanceStatus;
  trustReviewRequired: boolean;
}

export interface SyntheticCommandCenterConfidenceMetadata {
  confidenceCategory: SyntheticCommandCenterConfidenceCategory;
  confidenceReason?: string;
  confidenceSourceReferenceIds: string[];
  confidenceEvidenceIds: string[];
  confidenceSupportingIntelligenceIds: string[];
  confidenceReviewRequired: boolean;
}

export interface SyntheticCommandCenterDegradationMetadata {
  degradationCategory: SyntheticCommandCenterDegradationCategory;
  degradationReason?: string;
  degradationSourceReferenceIds: string[];
  degradationEvidenceIds: string[];
  degradedFieldNames: string[];
  degradationReviewRequired: boolean;
}

export interface SyntheticCommandCenterRecoveryMetadata {
  recoveryStatus: SyntheticCommandCenterValidationStatus;
  recoveryReason?: string;
  recoverySourceReferenceIds: string[];
  recoveryEvidenceIds: string[];
  recoveryRequiredFieldNames: string[];
  recoveryReviewRequired: boolean;
}

export interface SyntheticCommandCenterCandidate {
  commandCenterItemId: string;
  companyId: string;
  metadata: SyntheticCommandCenterMetadata;
  scope: SyntheticCommandCenterScope;
  priority: SyntheticCommandCenterPriority;
  roleCompatibility: SyntheticCommandCenterRoleCompatibility;
  surfaceCompatibility: SyntheticCommandCenterSurface;
  validationMetadata: SyntheticCommandCenterValidationMetadata;
  cashReconciliationAgingCompatibility?: SyntheticCommandCenterCashReconciliationAgingCompatibility;
  warnings: string[];
}
