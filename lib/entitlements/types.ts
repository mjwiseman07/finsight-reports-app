/**
 * Additive v1.5 entitlement types.
 */

export type AuditReadySize = 'small' | 'standard' | 'complex' | 'multi_entity';
export type AuditReadyBillingMode = 'monthly' | 'per_engagement';
export type AuditReadyEngagementStatus =
  | 'open'
  | 'prep_window'
  | 'closed'
  | 'timeout_expired'
  | 'cancelled';

export interface AuditReadyEngagement {
  id: string;
  audit_ready_tier: AuditReadySize;
  billing_mode: AuditReadyBillingMode;
  status: AuditReadyEngagementStatus;
  entity_count: number;
  pbc_request_count: number;
  auditor_user_count: number;
  opened_at: string;
  prep_window_ends_at: string | null;
  hard_timeout_at: string;
}
