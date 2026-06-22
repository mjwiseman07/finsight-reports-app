import * as fs from "fs";
import * as path from "path";

export type BaaStatus =
  | "baa-on-file"
  | "baa-pending"
  | "baa-not-applicable"
  | "baa-required-no-baa"
  | "spine-enforced-non-phi";

export interface SubprocessorRecord {
  subprocessorId: string;
  vendorName: string;
  category:
    | "cloud-hosting"
    | "database"
    | "monitoring"
    | "error-tracking"
    | "email"
    | "backup-dr"
    | "llm-ai-endpoint"
    | "analytics"
    | "support-tooling"
    | "authentication"
    | "other";
  dataAccessScope: "phi-possible" | "non-phi-only" | "no-data-flow";
  baaStatus: BaaStatus;
  baaExecutedDate: string | null;
  baaExpirationDate: string | null;
  baaDocumentReference: string | null;
  socReportOnFile: boolean;
  socReportCadence: "annual" | "biennial" | "none";
  spineEnforcedNonPhiPath: boolean;
  spineEnforcedNonPhiPathProofReference: string | null;
  notes: string;
  reviewCadence: "annual" | "semiannual" | "quarterly";
  lastReviewedDate: string | null;
}

export interface SubprocessorCallInput {
  subprocessorId: string;
  tenantId: string;
  overlayActive: ReadonlyArray<string>;
  payloadTags: ReadonlyArray<{
    taxonomy: string;
    phi: boolean;
  }>;
}

export interface SubprocessorAssertionResult {
  decision: "DENY" | "ALLOW";
  reason: string;
  evidence: {
    subprocessorId: string;
    baaStatus: BaaStatus | "unknown";
    phiInPayload: boolean;
    spineEnforcedNonPhiPath: boolean;
  };
}

export interface OutboundFlowInput {
  flowId: string;
  subprocessorId: string;
  tenantId: string;
  overlayActive: ReadonlyArray<string>;
  payloadTags: ReadonlyArray<{ taxonomy: string; phi: boolean }>;
}

export interface OutboundFlowProofResult {
  pass: boolean;
  totalFlows: number;
  violations: ReadonlyArray<{
    flowId: string;
    subprocessorId: string;
    rule:
      | "no-baa-on-file"
      | "baa-pending-phi-blocked"
      | "subprocessor-not-in-inventory"
      | "spine-enforcement-claimed-but-not-proven";
    detail: string;
  }>;
}

export interface SubprocessorRegistry {
  assertBaaOnFile(input: SubprocessorCallInput): SubprocessorAssertionResult;
  getSubprocessor(subprocessorId: string): SubprocessorRecord | undefined;
  listAllSubprocessors(): ReadonlyArray<SubprocessorRecord>;
  listPhiAuthorizedSubprocessors(): ReadonlyArray<SubprocessorRecord>;
  proveOutboundPhiBoundary(flows: ReadonlyArray<OutboundFlowInput>): OutboundFlowProofResult;
}

export interface SubprocessorRegistryMarker {
  subprocessorRegistryId: string;
  subprocessorRegistryKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

/** Fixed reference date for deterministic expiration checks in tests and D0 evidence. */
export const SUBPROCESSOR_REGISTRY_REFERENCE_DATE_ISO = "2026-06-20";

const INVENTORY_PATH = path.join(__dirname, "SUBPROCESSOR_INVENTORY.json");

function deny(
  subprocessorId: string,
  reason: string,
  evidence: SubprocessorAssertionResult["evidence"],
): SubprocessorAssertionResult {
  return { decision: "DENY", reason, evidence };
}

function allow(
  subprocessorId: string,
  reason: string,
  evidence: SubprocessorAssertionResult["evidence"],
): SubprocessorAssertionResult {
  return { decision: "ALLOW", reason, evidence };
}

function payloadHasPhi(payloadTags: ReadonlyArray<{ phi: boolean }>): boolean {
  return payloadTags.some((tag) => tag.phi === true);
}

function payloadHasDataFlow(payloadTags: ReadonlyArray<unknown>): boolean {
  return payloadTags.length > 0;
}

function isBaaExpired(record: SubprocessorRecord, referenceDateIso: string): boolean {
  if (!record.baaExpirationDate) return false;
  return record.baaExpirationDate < referenceDateIso;
}

function loadInventoryFromDisk(): SubprocessorRecord[] {
  const raw = fs.readFileSync(INVENTORY_PATH, "utf8");
  const parsed = JSON.parse(raw) as SubprocessorRecord[];
  return parsed;
}

let cachedInventory: SubprocessorRecord[] | null = null;

function getInventory(): ReadonlyArray<SubprocessorRecord> {
  if (!cachedInventory) {
    cachedInventory = loadInventoryFromDisk();
  }
  return cachedInventory;
}

function classifyViolation(
  result: SubprocessorAssertionResult,
  record: SubprocessorRecord | undefined,
): OutboundFlowProofResult["violations"][number]["rule"] {
  if (!record) return "subprocessor-not-in-inventory";
  if (record.baaStatus === "baa-pending" && result.evidence.phiInPayload) {
    return "baa-pending-phi-blocked";
  }
  if (
    record.baaStatus === "spine-enforced-non-phi" &&
    (!record.spineEnforcedNonPhiPath || !record.spineEnforcedNonPhiPathProofReference)
  ) {
    return "spine-enforcement-claimed-but-not-proven";
  }
  return "no-baa-on-file";
}

export function evaluateBaaAssertionForRecord(
  record: SubprocessorRecord | undefined,
  input: SubprocessorCallInput,
  referenceDateIso: string = SUBPROCESSOR_REGISTRY_REFERENCE_DATE_ISO,
): SubprocessorAssertionResult {
  const subprocessorId = input?.subprocessorId ?? "unknown";
  const phiInPayload = payloadHasPhi(input?.payloadTags ?? []);
  const dataFlowDetected = payloadHasDataFlow(input?.payloadTags ?? []);

  const baseEvidence = {
    subprocessorId,
    baaStatus: "unknown" as const,
    phiInPayload,
    spineEnforcedNonPhiPath: false,
  };

  if (!input?.subprocessorId) {
    return deny(subprocessorId, "missing_subprocessor_id", baseEvidence);
  }

  if (!record) {
    return deny(subprocessorId, "subprocessor_not_in_inventory", baseEvidence);
  }

  const evidence = {
    subprocessorId,
    baaStatus: record.baaStatus,
    phiInPayload,
    spineEnforcedNonPhiPath: record.spineEnforcedNonPhiPath,
  };

  if (record.baaStatus === "baa-required-no-baa") {
    return deny(subprocessorId, "baa_required_no_baa_on_file", evidence);
  }

  if (isBaaExpired(record, referenceDateIso)) {
    return deny(subprocessorId, "baa_expired", evidence);
  }

  if (record.baaStatus === "baa-pending" && phiInPayload) {
    return deny(subprocessorId, "baa_pending_phi_blocked", evidence);
  }

  if (record.baaStatus === "baa-not-applicable" && dataFlowDetected) {
    return deny(subprocessorId, "baa_not_applicable_data_flow_discrepancy", evidence);
  }

  if (record.baaStatus === "spine-enforced-non-phi") {
    if (!record.spineEnforcedNonPhiPath || !record.spineEnforcedNonPhiPathProofReference) {
      return deny(subprocessorId, "spine_enforced_non_phi_unproven", evidence);
    }
    if (phiInPayload) {
      return deny(subprocessorId, "spine_enforced_non_phi_phi_detected_upstream", evidence);
    }
    return allow(subprocessorId, "spine_enforced_non_phi_path_allowed", evidence);
  }

  if (record.baaStatus === "baa-on-file") {
    return allow(subprocessorId, "baa_on_file", evidence);
  }

  if (record.baaStatus === "baa-pending" && !phiInPayload) {
    return allow(subprocessorId, "baa_pending_non_phi_allowed", evidence);
  }

  if (record.baaStatus === "baa-not-applicable" && !dataFlowDetected) {
    return allow(subprocessorId, "baa_not_applicable_no_data_flow", evidence);
  }

  return deny(subprocessorId, "fail_closed_default_deny", evidence);
}

export function assertBaaOnFile(
  input: SubprocessorCallInput,
  referenceDateIso: string = SUBPROCESSOR_REGISTRY_REFERENCE_DATE_ISO,
): SubprocessorAssertionResult {
  const record = getInventory().find((entry) => entry.subprocessorId === input?.subprocessorId);
  return evaluateBaaAssertionForRecord(record, input, referenceDateIso);
}

export function getSubprocessor(subprocessorId: string): SubprocessorRecord | undefined {
  return getInventory().find((entry) => entry.subprocessorId === subprocessorId);
}

export function listAllSubprocessors(): ReadonlyArray<SubprocessorRecord> {
  return [...getInventory()];
}

export function listPhiAuthorizedSubprocessors(): ReadonlyArray<SubprocessorRecord> {
  return getInventory().filter(
    (entry) => entry.baaStatus === "baa-on-file" && !isBaaExpired(entry, SUBPROCESSOR_REGISTRY_REFERENCE_DATE_ISO),
  );
}

export function proveOutboundPhiBoundary(
  flows: ReadonlyArray<OutboundFlowInput>,
): OutboundFlowProofResult {
  const violations: OutboundFlowProofResult["violations"][number][] = [];

  for (const flow of flows) {
    const result = assertBaaOnFile({
      subprocessorId: flow.subprocessorId,
      tenantId: flow.tenantId,
      overlayActive: flow.overlayActive,
      payloadTags: flow.payloadTags,
    });
    if (result.decision === "DENY") {
      const record = getSubprocessor(flow.subprocessorId);
      violations.push({
        flowId: flow.flowId,
        subprocessorId: flow.subprocessorId,
        rule: classifyViolation(result, record),
        detail: result.reason,
      });
    }
  }

  return {
    pass: violations.length === 0,
    totalFlows: flows.length,
    violations,
  };
}

export function validateInventoryLlmRule(
  inventory: ReadonlyArray<SubprocessorRecord> = getInventory(),
): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const entry of inventory) {
    if (entry.category === "llm-ai-endpoint") {
      if (entry.dataAccessScope === "no-data-flow") {
        violations.push(`${entry.subprocessorId}: llm endpoint cannot be no-data-flow`);
      }
      if (
        entry.dataAccessScope === "phi-possible" &&
        entry.baaStatus !== "baa-on-file" &&
        entry.baaStatus !== "baa-pending"
      ) {
        violations.push(`${entry.subprocessorId}: phi-possible LLM must be baa-on-file or baa-pending`);
      }
    }
    if (entry.baaStatus === "spine-enforced-non-phi") {
      if (!entry.spineEnforcedNonPhiPath || !entry.spineEnforcedNonPhiPathProofReference) {
        violations.push(`${entry.subprocessorId}: spine-enforced-non-phi missing proof reference`);
      }
    }
    if (
      entry.baaStatus === "spine-enforced-non-phi" &&
      entry.spineEnforcedNonPhiPathProofReference &&
      !fs.existsSync(path.join(process.cwd(), entry.spineEnforcedNonPhiPathProofReference))
    ) {
      violations.push(
        `${entry.subprocessorId}: proof reference missing on disk: ${entry.spineEnforcedNonPhiPathProofReference}`,
      );
    }
  }
  return { pass: violations.length === 0, violations };
}

export const subprocessorRegistry: SubprocessorRegistry & SubprocessorRegistryMarker = {
  assertBaaOnFile,
  getSubprocessor,
  listAllSubprocessors,
  listPhiAuthorizedSubprocessors,
  proveOutboundPhiBoundary,
  subprocessorRegistryId: "subprocessor-registry:default",
  subprocessorRegistryKey: "subprocessor-registry:default",
  containsVerticalComplianceLogic: false,
  executable: false,
};
