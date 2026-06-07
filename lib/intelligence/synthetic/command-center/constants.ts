import type {
  SyntheticCommandCenterAttentionCategory,
  SyntheticCommandCenterBriefingCategory,
  SyntheticCommandCenterCadenceCategory,
  SyntheticCommandCenterConfidenceCategory,
  SyntheticCommandCenterDecisionSurfaceCategory,
  SyntheticCommandCenterDegradationCategory,
  SyntheticCommandCenterGovernanceStatus,
  SyntheticCommandCenterIntelligenceSourceCategory,
  SyntheticCommandCenterPriorityLevel,
  SyntheticCommandCenterRoleCategory,
  SyntheticCommandCenterRoutingCategory,
  SyntheticCommandCenterSurfaceCategory,
  SyntheticCommandCenterTrustCategory,
} from "./types";

export const SYNTHETIC_COMMAND_CENTER_SCHEMA_VERSION = 1;
export const SYNTHETIC_COMMAND_CENTER_TAXONOMY_VERSION = 1;
export const SYNTHETIC_COMMAND_CENTER_CONTRACT_VERSION = 1;
export const SYNTHETIC_COMMAND_CENTER_COMPATIBILITY_VERSION = 1;
export const SYNTHETIC_COMMAND_CENTER_SCORE_MIN = 0;
export const SYNTHETIC_COMMAND_CENTER_SCORE_MAX = 1;
export const SYNTHETIC_COMMAND_CENTER_CONFIDENCE_MIN = 0;
export const SYNTHETIC_COMMAND_CENTER_CONFIDENCE_MAX = 1;

export const SYNTHETIC_COMMAND_CENTER_FUTURE_VERIFIER_CHECKLIST = [
  "schema_version_exports_present",
  "taxonomy_version_exports_present",
  "contract_version_exports_present",
  "compatibility_version_exports_present",
  "taxonomy_constants_match_type_unions",
  "core_contract_exports_present",
  "evidence_lineage_contract_exports_present",
  "routing_validation_contract_exports_present",
  "memory_governance_contract_exports_present",
  "barrel_exports_types_and_constants",
] as const;

export const SYNTHETIC_COMMAND_CENTER_REPOSITORY_SAFETY_EXCLUSIONS = [
  "no_verifier_script",
  "no_npm_script",
  "no_package_json_changes",
  "no_runtime_validation",
  "no_validation_engine",
  "no_builders",
  "no_calculations",
  "no_routing_engines",
  "no_scoring_engines",
  "no_ui",
  "no_persistence",
  "no_workflows",
  "no_dependencies",
] as const;

export const SYNTHETIC_COMMAND_CENTER_SURFACE_CATEGORIES: SyntheticCommandCenterSurfaceCategory[] = [
  "executive_briefing",
  "decision_queue",
  "watchlist",
  "firm_portfolio",
  "client_portfolio",
  "close_command",
  "controller_command",
  "cash_command",
  "workforce_command",
  "tax_compatibility",
  "relationship_intelligence",
  "data_quality",
  "integration_health",
  "benchmark_intelligence",
  "onboarding",
];

export const SYNTHETIC_COMMAND_CENTER_INTELLIGENCE_SOURCE_CATEGORIES: SyntheticCommandCenterIntelligenceSourceCategory[] =
  [
    "forecasting",
    "scenario_modeling",
    "recommendations",
    "commentary",
    "company_memory",
    "evidence_store",
    "confidence_scoring",
    "signal_engine",
    "metric_series",
    "historical_snapshots",
    "industry_profiles",
    "manual_review",
  ];

export const SYNTHETIC_COMMAND_CENTER_DECISION_SURFACE_CATEGORIES: SyntheticCommandCenterDecisionSurfaceCategory[] =
  [
    "single_pane_summary",
    "executive_attention",
    "decision_required",
    "monitoring",
    "risk_review",
    "approval_review",
    "board_preparation",
    "meeting_preparation",
    "client_advisory",
    "firm_management",
  ];

export const SYNTHETIC_COMMAND_CENTER_ATTENTION_CATEGORIES: SyntheticCommandCenterAttentionCategory[] = [
  "critical_attention",
  "executive_review",
  "manager_review",
  "monitor",
  "informational",
  "deferred",
];

export const SYNTHETIC_COMMAND_CENTER_PRIORITY_LEVELS: SyntheticCommandCenterPriorityLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
  "informational",
];

export const SYNTHETIC_COMMAND_CENTER_ROLE_CATEGORIES: SyntheticCommandCenterRoleCategory[] = [
  "executive",
  "cfo",
  "controller",
  "accounting_manager",
  "firm_owner",
  "firm_manager",
  "client_owner",
  "advisor",
  "board",
  "operations",
  "tax",
  "admin",
];

export const SYNTHETIC_COMMAND_CENTER_BRIEFING_CATEGORIES: SyntheticCommandCenterBriefingCategory[] = [
  "daily_briefing",
  "weekly_briefing",
  "monthly_briefing",
  "board_briefing",
  "meeting_briefing",
  "event_driven_briefing",
  "firm_manager_briefing",
  "client_owner_briefing",
];

export const SYNTHETIC_COMMAND_CENTER_CADENCE_CATEGORIES: SyntheticCommandCenterCadenceCategory[] = [
  "real_time",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "event_driven",
  "on_demand",
];

export const SYNTHETIC_COMMAND_CENTER_TRUST_CATEGORIES: SyntheticCommandCenterTrustCategory[] = [
  "trusted",
  "needs_review",
  "degraded",
  "blocked",
  "unknown",
];

export const SYNTHETIC_COMMAND_CENTER_CONFIDENCE_CATEGORIES: SyntheticCommandCenterConfidenceCategory[] = [
  "high_confidence",
  "medium_confidence",
  "low_confidence",
  "insufficient_evidence",
  "unknown",
];

export const SYNTHETIC_COMMAND_CENTER_DEGRADATION_CATEGORIES: SyntheticCommandCenterDegradationCategory[] = [
  "none",
  "partial_data",
  "stale_data",
  "conflicting_evidence",
  "permission_limited",
  "source_unavailable",
  "not_applicable",
];

export const SYNTHETIC_COMMAND_CENTER_GOVERNANCE_STATUSES: SyntheticCommandCenterGovernanceStatus[] = [
  "candidate",
  "under_review",
  "approved",
  "rejected",
  "retired",
  "not_required",
];

export const SYNTHETIC_COMMAND_CENTER_ROUTING_CATEGORIES: SyntheticCommandCenterRoutingCategory[] = [
  "primary_surface",
  "secondary_surface",
  "drill_down",
  "briefing",
  "watchlist",
  "decision_queue",
  "portfolio_view",
  "governance_review",
];
