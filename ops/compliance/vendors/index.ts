/** Barrel export — containsVerticalComplianceLogic: false (vendor management namespace). */
export {
  assertBaaOnFile,
  evaluateBaaAssertionForRecord,
  listAllSubprocessors,
  listPhiAuthorizedSubprocessors,
  getSubprocessor,
  proveOutboundPhiBoundary,
  subprocessorRegistry,
  validateInventoryLlmRule,
  SUBPROCESSOR_REGISTRY_REFERENCE_DATE_ISO,
  type BaaStatus,
  type OutboundFlowInput,
  type OutboundFlowProofResult,
  type SubprocessorAssertionResult,
  type SubprocessorCallInput,
  type SubprocessorRecord,
  type SubprocessorRegistry,
  type SubprocessorRegistryMarker,
} from "./subprocessorRegistry";

export {
  executeSubprocessorRegistryStaticConstructionTests,
  SUBPROCESSOR_REGISTRY_STATIC_CONSTRUCTION_CASES,
  type SubprocessorRegistryStaticConstructionCase,
  type SubprocessorRegistryStaticConstructionCaseResult,
} from "./subprocessorRegistryStaticConstructionTests";
