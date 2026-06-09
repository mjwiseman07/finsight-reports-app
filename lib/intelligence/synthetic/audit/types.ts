export type SyntheticAuditCategory =
  | "journal_entry_audit"
  | "reconciliation_audit"
  | "close_readiness_audit"
  | "audit_readiness"
  | "pbc_request"
  | "audit_schedule"
  | "audit_tie_out"
  | "audit_response"
  | "debt_covenant"
  | "platform_integrity"
  | "trust_verification"
  | "workflow_visibility"
  | "missing_activity"
  | "recurring_pattern"
  | "anomaly"
  | "expected_activity"
  | "flux_analysis"
  | "inventory_audit"
  | "unit_cost_audit"
  | "cutoff_audit"
  | "period_end_activity"
  | "cash_reconciliation"
  | "bank_activity"
  | "cash_application"
  | "cash_disbursement"
  | "tax_audit"
  | "sales_tax_audit"
  | "vat_audit"
  | "lease_audit"
  | "revenue_recognition_audit"
  | "balance_sheet_integrity"
  | "materiality"
  | "intelligence_surfacing";

export type SyntheticAuditObservationCategory =
  | "background_observation"
  | "coverage_observation"
  | "evidence_observation"
  | "tie_out_observation"
  | "workflow_observation"
  | "materiality_observation"
  | "control_observation"
  | "account_relationship_observation"
  | "cash_observation"
  | "tax_observation"
  | "journal_observation"
  | "reconciliation_observation"
  | "schedule_observation";

export type SyntheticAuditFindingCategory =
  | "audit_attention_item"
  | "audit_risk_item"
  | "audit_review_item"
  | "audit_readiness_item"
  | "audit_exception_item"
  | "audit_finding_item"
  | "controller_review_item"
  | "materiality_item"
  | "coverage_gap_item"
  | "evidence_gap_item";

export type SyntheticAuditExceptionCategory =
  | "missing_support"
  | "insufficient_support"
  | "failed_tie_out"
  | "unresolved_variance"
  | "incomplete_schedule"
  | "missing_activity"
  | "stagnant_balance"
  | "unsupported_balance"
  | "unsupported_journal"
  | "management_override"
  | "workflow_blocker"
  | "coverage_gap"
  | "out_of_balance_schedule";

export type SyntheticAuditRiskCategory =
  | "low_risk"
  | "moderate_risk"
  | "high_risk"
  | "critical_risk"
  | "unknown_risk";

export type SyntheticAuditConfidenceCategory =
  | "high_confidence"
  | "medium_confidence"
  | "low_confidence"
  | "insufficient_evidence"
  | "unknown";

export type SyntheticAuditTrustCategory = "trusted" | "needs_review" | "degraded" | "blocked" | "unknown";

export type SyntheticAuditGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "retired"
  | "not_required";

export type SyntheticAuditMaterialityCategory =
  | "material"
  | "potentially_material"
  | "immaterial"
  | "recurring_immaterial"
  | "future_materiality_risk"
  | "not_evaluated";

export type SyntheticAuditSurfaceCompatibilityTarget =
  | "command_center"
  | "executive_summary"
  | "decision_queue"
  | "watchlist"
  | "briefing"
  | "pulse";

export type SyntheticAuditPersonaCategory =
  | "controller"
  | "accounting_manager"
  | "accounting_firm"
  | "bookkeeper"
  | "fractional_cfo"
  | "cfo"
  | "business_owner";

export type SyntheticAuditPackageCategory =
  | "starter"
  | "controller"
  | "firm"
  | "fractional_cfo"
  | "enterprise";

export type SyntheticAuditMemoryCompatibilityCategory =
  | "memory_eligible"
  | "memory_pending_review"
  | "memory_ineligible"
  | "memory_not_required";

export type SyntheticAuditLearningCompatibilityCategory =
  | "learning_eligible"
  | "learning_pending_review"
  | "learning_ineligible"
  | "learning_not_required";

export type SyntheticAuditReadinessCategory =
  | "ready"
  | "ready_for_review"
  | "blocked"
  | "incomplete"
  | "not_started"
  | "not_applicable";

export type SyntheticAuditTieOutCategory =
  | "tied_out"
  | "variance_present"
  | "unresolved_difference"
  | "not_started"
  | "not_required";

export type SyntheticAuditWorkflowState =
  | "not_started"
  | "gathering_support"
  | "schedule_preparation"
  | "tie_out_in_progress"
  | "variance_review"
  | "waiting_for_support"
  | "waiting_for_management"
  | "waiting_for_controller"
  | "ready_for_review"
  | "ready_for_auditor"
  | "completed";

export type SyntheticAuditResponseCategory =
  | "data_answerable"
  | "human_input_required"
  | "unavailable_data"
  | "management_representation_required"
  | "unsupported";

export type SyntheticAuditScheduleCategory =
  | "ar_aging"
  | "ap_aging"
  | "inventory_rollforward"
  | "fixed_asset_rollforward"
  | "debt_schedule"
  | "debt_covenant_schedule"
  | "prepaid_schedule"
  | "deferred_revenue_schedule"
  | "accrued_expense_schedule"
  | "revenue_schedule"
  | "bank_reconciliation_support"
  | "lease_schedule"
  | "equity_rollforward"
  | "payroll_support_schedule"
  | "unsupported_schedule";

export interface SyntheticAuditScope {
  companyId: string;
  firmId?: string;
  clientId?: string;
  portfolioId?: string;
  entityId?: string;
  userId?: string;
  customerIsolationRequired: boolean;
  firmIsolationRequired: boolean;
  clientIsolationRequired: boolean;
  isolationBoundaryIds: string[];
}

export interface SyntheticAuditObservationMetadata {
  auditObservationId: string;
  companyId: string;
  auditCategory: SyntheticAuditCategory;
  observationCategory: SyntheticAuditObservationCategory;
  observedAt?: string;
  sourceArtifactIds: string[];
  relatedAccountIds: string[];
  relatedScheduleIds: string[];
  relatedReconciliationIds: string[];
  relatedJournalEntryIds: string[];
  relatedTaxIds: string[];
  relatedCashIds: string[];
  relatedControlIds: string[];
}

export interface SyntheticAuditFindingMetadata {
  auditFindingId: string;
  companyId: string;
  findingCategory: SyntheticAuditFindingCategory;
  auditCategory: SyntheticAuditCategory;
  observationReferenceIds: string[];
  exceptionReferenceIds: string[];
  riskReferenceIds: string[];
  surfaceCandidateReferenceIds: string[];
}

export interface SyntheticAuditExceptionMetadata {
  auditExceptionId: string;
  companyId: string;
  exceptionCategory: SyntheticAuditExceptionCategory;
  auditCategory: SyntheticAuditCategory;
  exceptionSourceReferenceIds: string[];
  unresolvedVarianceReferenceIds: string[];
  blockedReadinessReferenceIds: string[];
}

export interface SyntheticAuditRiskMetadata {
  auditRiskId: string;
  companyId: string;
  riskCategory: SyntheticAuditRiskCategory;
  auditCategory: SyntheticAuditCategory;
  riskSourceReferenceIds: string[];
  relatedFindingIds: string[];
  relatedExceptionIds: string[];
}

export interface SyntheticAuditEvidenceReferences {
  evidenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  supportingObservationIds: string[];
  supportingFindingIds: string[];
  supportingExceptionIds: string[];
  supportingRiskIds: string[];
  supportingScheduleIds: string[];
  supportingTieOutIds: string[];
  supportingReconciliationIds: string[];
  supportingJournalEntryIds: string[];
  supportingOutcomeIds: string[];
  supportingMemoryIds: string[];
}

export interface SyntheticAuditTrustMetadata {
  trustCategory: SyntheticAuditTrustCategory;
  trustReason?: string;
  trustEvidenceIds: string[];
  trustSourceReferenceIds: string[];
  trustReviewRequired: boolean;
}

export interface SyntheticAuditConfidenceMetadata {
  confidenceCategory: SyntheticAuditConfidenceCategory;
  confidenceReason?: string;
  confidenceEvidenceIds: string[];
  confidenceSourceReferenceIds: string[];
  confidenceReviewRequired: boolean;
}

export interface SyntheticAuditGovernanceMetadata {
  governanceStatus: SyntheticAuditGovernanceStatus;
  governanceReason?: string;
  governanceBoundaryIds: string[];
  governanceEvidenceIds: string[];
  governanceReviewRequired: boolean;
}

export interface SyntheticAuditMemoryCompatibility {
  memoryCompatibilityCategory: SyntheticAuditMemoryCompatibilityCategory;
  memoryReferenceIds: string[];
  controllerMemoryIds: string[];
  auditMemoryIds: string[];
  outcomeMemoryIds: string[];
  memoryEvidenceIds: string[];
  memoryReviewRequired: boolean;
}

export interface SyntheticAuditLearningCompatibility {
  learningCompatibilityCategory: SyntheticAuditLearningCompatibilityCategory;
  learningReferenceIds: string[];
  relatedOutcomeIds: string[];
  relatedMemoryIds: string[];
  relatedAuditIds: string[];
  relatedControllerIds: string[];
  learningEvidenceIds: string[];
  learningReviewRequired: boolean;
}

export interface SyntheticAuditSurfaceCompatibility {
  surfaceTargets: SyntheticAuditSurfaceCompatibilityTarget[];
  commandCenterReferenceIds: string[];
  executiveSummaryReferenceIds: string[];
  decisionQueueReferenceIds: string[];
  watchlistReferenceIds: string[];
  briefingReferenceIds: string[];
  pulseReferenceIds: string[];
  surfaceEvidenceIds: string[];
  surfaceReviewRequired: boolean;
}

export interface SyntheticAuditMaterialityCompatibility {
  materialityCategory: SyntheticAuditMaterialityCategory;
  materialityReferenceIds: string[];
  materialityEvidenceIds: string[];
  materialityReason?: string;
  personaSpecificMaterialityRequired: boolean;
  packageSpecificMaterialityRequired: boolean;
  futureMaterialityReviewRequired: boolean;
}

export interface SyntheticAuditPersonaCompatibility {
  personaCategories: SyntheticAuditPersonaCategory[];
  personaReferenceIds: string[];
  personaEvidenceIds: string[];
  roleVisibilityRequired: boolean;
  personaReviewRequired: boolean;
}

export interface SyntheticAuditPackageCompatibility {
  packageCategories: SyntheticAuditPackageCategory[];
  packageReferenceIds: string[];
  packageEvidenceIds: string[];
  packageVisibilityRequired: boolean;
  packageReviewRequired: boolean;
}

export interface SyntheticAuditReadinessCompatibility {
  readinessCategory: SyntheticAuditReadinessCategory;
  readinessReferenceIds: string[];
  readinessEvidenceIds: string[];
  readinessBlockerIds: string[];
  readinessReviewRequired: boolean;
}

export interface SyntheticAuditTieOutCompatibility {
  tieOutCategory: SyntheticAuditTieOutCategory;
  tieOutReferenceIds: string[];
  glAccountReferenceIds: string[];
  trialBalanceReferenceIds: string[];
  subsidiaryLedgerReferenceIds: string[];
  sourceDocumentReferenceIds: string[];
  varianceReferenceIds: string[];
  unresolvedDifferenceReferenceIds: string[];
  tieOutEvidenceIds: string[];
  tieOutReviewRequired: boolean;
}

export interface SyntheticAuditWorkflowCompatibility {
  workflowState: SyntheticAuditWorkflowState;
  workflowReferenceIds: string[];
  workflowBlockerIds: string[];
  workflowDependencyIds: string[];
  workflowEvidenceIds: string[];
  workflowReviewRequired: boolean;
}

export interface SyntheticAuditResponseCompatibility {
  responseCategory: SyntheticAuditResponseCategory;
  responseReferenceIds: string[];
  auditorQuestionReferenceIds: string[];
  humanInputRequirementIds: string[];
  missingDataReferenceIds: string[];
  responseEvidenceIds: string[];
  responseReviewRequired: boolean;
}

export interface SyntheticAuditScheduleCompatibility {
  scheduleCategory: SyntheticAuditScheduleCategory;
  scheduleReferenceIds: string[];
  beginningBalanceReferenceIds: string[];
  activityReferenceIds: string[];
  endingBalanceReferenceIds: string[];
  supportingDocumentReferenceIds: string[];
  scheduleEvidenceIds: string[];
  scheduleReviewRequired: boolean;
}

export interface SyntheticAuditContract {
  scope: SyntheticAuditScope;
  observationMetadata?: SyntheticAuditObservationMetadata;
  findingMetadata?: SyntheticAuditFindingMetadata;
  exceptionMetadata?: SyntheticAuditExceptionMetadata;
  riskMetadata?: SyntheticAuditRiskMetadata;
  evidence: SyntheticAuditEvidenceReferences;
  trustMetadata?: SyntheticAuditTrustMetadata;
  confidenceMetadata?: SyntheticAuditConfidenceMetadata;
  governanceMetadata?: SyntheticAuditGovernanceMetadata;
  memoryCompatibility?: SyntheticAuditMemoryCompatibility;
  learningCompatibility?: SyntheticAuditLearningCompatibility;
  surfaceCompatibility?: SyntheticAuditSurfaceCompatibility;
  materialityCompatibility?: SyntheticAuditMaterialityCompatibility;
  personaCompatibility?: SyntheticAuditPersonaCompatibility;
  packageCompatibility?: SyntheticAuditPackageCompatibility;
  readinessCompatibility?: SyntheticAuditReadinessCompatibility;
  tieOutCompatibility?: SyntheticAuditTieOutCompatibility;
  workflowCompatibility?: SyntheticAuditWorkflowCompatibility;
  responseCompatibility?: SyntheticAuditResponseCompatibility;
  scheduleCompatibility?: SyntheticAuditScheduleCompatibility;
}
