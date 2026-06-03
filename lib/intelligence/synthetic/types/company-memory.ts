export type SyntheticCompanyMemoryRecordType =
  | "company_fact"
  | "recurring_pattern"
  | "advisor_feedback"
  | "known_entity_alias"
  | "recommendation_memory";

export interface SyntheticCompanyFact {
  key: string;
  value: string | number | boolean | null;
  source?: "advisor" | "system" | "import";
  confidence?: number;
}

export interface SyntheticRecurringPattern {
  patternKey: string;
  metricKey?: string;
  description: string;
  expectedPeriods?: string[];
  evidenceIds?: string[];
}

export interface SyntheticAdvisorFeedbackRecord {
  feedbackId: string;
  signalId?: string;
  recommendationId?: string;
  disposition: "accepted" | "dismissed" | "modified" | "deferred";
  notes?: string;
}

export interface SyntheticKnownEntityAlias {
  canonicalName: string;
  aliases: string[];
  entityType: "customer" | "vendor" | "account" | "department" | "class" | "location" | "project";
}

export interface SyntheticRecommendationMemory {
  recommendationType: string;
  lastStatus?: string;
  lastRecommendedAt?: string;
  recurrenceCount?: number;
}

export interface SyntheticCompanyMemoryRecord {
  id: string;
  companyId: string | null;
  recordType: SyntheticCompanyMemoryRecordType;
  fact?: SyntheticCompanyFact;
  recurringPattern?: SyntheticRecurringPattern;
  advisorFeedback?: SyntheticAdvisorFeedbackRecord;
  knownEntityAlias?: SyntheticKnownEntityAlias;
  recommendationMemory?: SyntheticRecommendationMemory;
  createdAt: string;
  updatedAt?: string;
}
