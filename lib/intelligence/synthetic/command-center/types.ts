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
