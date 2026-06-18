import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../../synthetic/actions/contracts";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../../synthetic/audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../../synthetic/knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../../synthetic/organizational-memory/memory-object";

export type IntegrationConnectorKind =
  | "erp"
  | "banking"
  | "document"
  | "email"
  | "payments"
  | "hris"
  | "crm"
  | "ecommerce"
  | "edi"
  | "file_based";

export type IntegrationAuthModel = "oauth" | "api_key" | "file_based" | "direct_feed" | "other";

export type IntegrationConnectionHealthStatus = "healthy" | "degraded" | "failed" | "not_evaluated";

export type ConnectorActivityOperation = "read" | "write" | "webhook_receive" | "health_check";

export type IntegrationDataSensitivityTier = "high" | "medium" | "low";

export interface IntegrationBaseContract {
  boundPhase40SnapshotHash: string;
  boundPhase39SnapshotHash: string;
  boundPhase38SnapshotHash: string;
  phase405StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  // Fail closed: if sensitivity cannot be determined at construction, default containsPHI to true
  // and dataSensitivityTier to high. Phase 40.5 classifies and isolates only; detailed compliance
  // controls live in Phase 42.5.
  containsPHI: boolean;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface Phase40HandoffConsumptionContract extends IntegrationBaseContract {
  phase40OrganizationalHandoffHandle: string;
  phase40HandoffReferenceIds: string[];
  boundPhase40SnapshotHash: string;
}

export interface IntegrationTenantIsolationContract extends Phase40HandoffConsumptionContract {
  firmTenantId: string;
  clientTenantId: string;
  perTenantCredentialIsolation: true;
}

export interface ConnectorContract extends IntegrationTenantIsolationContract {
  connectorId: string;
  connectorKey: string;
  connectorType: string;
  connectorKind: IntegrationConnectorKind;
  authModel: IntegrationAuthModel;
  readModeSupported: boolean;
  writeModeSupported: boolean;
  writeModeEnabled: false;
  startsReadOnly: true;
  recommendationOnlyByDefault: true;
  failClosedOnCredentialError: true;
  credentialNeverLogged: true;
  perTenantCredentialIsolation: true;
  writeModeRequiresHumanApproval: true;
  writeModeRequiresGovernanceEntry: true;
  connectorComplete: boolean;
}

export interface CredentialReferenceContract extends IntegrationTenantIsolationContract {
  credentialReferenceId: string;
  credentialReferenceKey: string;
  credentialHandle: string;
  firmTenantId: string;
  clientTenantId: string;
  storedByHandleOnly: true;
  neverStoredInPlainText: true;
  neverLogged: true;
  encryptedAtRest: true;
  failClosedOnCredentialError: true;
  credentialReferenceComplete: boolean;
}

export interface ConnectionHealthContract extends IntegrationTenantIsolationContract {
  connectionHealthId: string;
  connectionHealthKey: string;
  connectorId: string;
  healthStatus: IntegrationConnectionHealthStatus;
  lastSuccessfulOperationReference: string;
  gracePeriodBeforeStaleFlag: string;
  gracePeriodBeforeCustomerAlert: string;
  gracePeriodBeforeAutoSuspend: string;
  reconnectionPlaybookReference: string;
  feedsPhase40GHealth: true;
  escalatesViaPhase40F: true;
  failClosedOnFailure: true;
  connectionHealthComplete: boolean;
}

export interface WriteModeContract extends IntegrationTenantIsolationContract {
  writeModeId: string;
  writeModeKey: string;
  connectorId: string;
  writeModeEnabled: false;
  enabledByHumanApproverId: string;
  governanceEntryReferenceId: string;
  documentedUseCase: string;
  documentedScope: string;
  riskAcknowledged: boolean;
  startsReadOnly: true;
  writeIsRecommendationOnlyByDefault: true;
  enablingRequiresHumanApproval: true;
  enablingRequiresGovernanceEntry: true;
  writeModeComplete: boolean;
}

export interface RateLimitContract extends IntegrationTenantIsolationContract {
  rateLimitId: string;
  rateLimitKey: string;
  connectorId: string;
  perConnectorRateLimitMetadata: Record<string, unknown>;
  retryPolicyMetadata: Record<string, unknown>;
  crossTenantCoordinationRequired: boolean;
  perTenantQuotaMetadata: Record<string, unknown>;
  rateLimitExhaustionEscalatesViaPhase40F: true;
  rateLimitComplete: boolean;
}

export interface ConnectorActivityEntry extends IntegrationTenantIsolationContract {
  connectorActivityEntryId: string;
  connectorActivityEntryKey: string;
  connectorId: string;
  firmTenantId: string;
  clientTenantId: string;
  operation: ConnectorActivityOperation;
  requestSummary: string;
  responseStatus: string;
  recordCountAffected: number;
  humanApprovalReference: string;
  linkedRecommendationAuditEntryId: string;
  priorEntryReferenceId: string;
  appendOnly: true;
  immutableRecord: true;
  neverEditedOrDeleted: true;
  connectorActivityEntryComplete: boolean;
}

export interface InboundDataClassificationContract extends IntegrationTenantIsolationContract {
  inboundDataClassificationId: string;
  inboundDataClassificationKey: string;
  connectorId: string;
  containsPHI: boolean;
  containsPII: boolean;
  dataSensitivityTier: IntegrationDataSensitivityTier;
  inferredFromContent: boolean;
  failClosedToHighSensitivity: true;
  classificationComplete: boolean;
}
