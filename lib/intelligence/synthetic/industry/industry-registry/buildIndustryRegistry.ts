import { stableSnapshotHash } from "../../../core/hash";
import type { IndustryBaseContract, IndustryPerTopicDeclaration, IndustryStatus } from "../contracts";
import {
  buildIndustryRegistryEntry,
  type BuildIndustryRegistryEntryInput,
  type SyntheticIndustryRegistryEntry,
} from "./buildIndustryRegistryEntry";

export interface BuildIndustryRegistryInput extends Partial<IndustryBaseContract> {
  industryEntries?: BuildIndustryRegistryEntryInput[];
  industryRegistryComplete?: boolean;
  contentReadinessByIndustry?: Partial<Record<string, boolean>>;
  healthcareSpecialistAttestationComplete?: boolean;
}

export interface SyntheticIndustryRegistry extends IndustryBaseContract {
  industryRegistryId: string;
  industryRegistryKey: string;
  registryEntryReferenceIds: string[];
  activeIndustryIdentifiers: string[];
  nonActiveIndustryIdentifiers: string[];
  selectableIndustryIdentifiers: string[];
  selectableEqualsActiveOnly: true;
  neverSilentlySubstitutesIndustry: true;
  industryRegistryComplete: boolean;
}

export interface BuildIndustryRegistryResult {
  industryRegistry: SyntheticIndustryRegistry | null;
  industryRegistryEntries: SyntheticIndustryRegistryEntry[];
  skippedIndexes: number[];
  warnings: string[];
}

const HEALTHCARE_SPECIALIST_TOPICS = [
  "net_patient_service_revenue",
  "contractual_allowance_reserves",
  "implicit_price_concessions",
  "denial_reserves_and_credit_loss_boundary",
  "charity_care_and_community_benefit",
  "capitation_revenue",
  "risk_sharing_value_based_care",
  "drug_pricing_program_340b",
  "medical_malpractice_accruals",
  "healthcare_specific_intangibles",
] as const;

const HEALTHCARE_GENERALIST_TOPICS = [
  "healthcare_specific_fixed_assets",
  "healthcare_specific_lease_considerations",
] as const;

function buildHealthcareRoutingRule(topicIdentifier: string): IndustryPerTopicDeclaration["routingRules"] {
  return [
    {
      routingRuleIdentifier: `healthcare.${topicIdentifier}.scope`,
      inScopeTestDescription: `Entity industry classification is healthcare and topic ${topicIdentifier} is within declared registry scope`,
      outOfScopeTestDescription: `Entity industry classification is not healthcare or topic ${topicIdentifier} is outside declared registry scope`,
      scopeBoundaryAttestationReferenceId: "",
    },
  ];
}

function buildHealthcarePerTopicDeclarations(): IndustryPerTopicDeclaration[] {
  const specialistDeclarations: IndustryPerTopicDeclaration[] = HEALTHCARE_SPECIALIST_TOPICS.map((topicIdentifier) => ({
    topicIdentifier,
    requiresSpecialistReview: true,
    specialistCredentialRequirements:
      topicIdentifier === "drug_pricing_program_340b"
        ? {
            requiredCredentials: [
              "340B ACE certification",
              "dedicated 340B compliance role",
              "named consulting firm with 340B specialization",
            ],
            requiredSpecialization: "340B_compliance",
            namedCredentialRequiredFor340B: true,
          }
        : {
            requiredCredentials: ["healthcare_accounting_specialization"],
            requiredSpecialization: "healthcare_accounting",
            namedCredentialRequiredFor340B: false,
          },
    authoritativeSourcesRequired: [],
    routingRules: buildHealthcareRoutingRule(topicIdentifier),
  }));

  const generalistDeclarations: IndustryPerTopicDeclaration[] = HEALTHCARE_GENERALIST_TOPICS.map((topicIdentifier) => ({
    topicIdentifier,
    requiresSpecialistReview: false,
    specialistCredentialRequirements: {
      requiredCredentials: [],
      requiredSpecialization: "",
      namedCredentialRequiredFor340B: false,
    },
    authoritativeSourcesRequired: [],
    routingRules: buildHealthcareRoutingRule(topicIdentifier),
  }));

  return [...specialistDeclarations, ...generalistDeclarations];
}

const RECOGNIZED_UNPOPULATED_INDUSTRY_BLUEPRINT: ReadonlyArray<{
  industryIdentifier: string;
  industryDisplayName: string;
}> = [
  { industryIdentifier: "construction", industryDisplayName: "Construction" },
  { industryIdentifier: "nonprofit", industryDisplayName: "Nonprofit" },
  {
    industryIdentifier: "banking_financial_services",
    industryDisplayName: "Banking and Financial Services",
  },
  { industryIdentifier: "insurance", industryDisplayName: "Insurance" },
  { industryIdentifier: "real_estate", industryDisplayName: "Real Estate" },
  { industryIdentifier: "oil_gas_extractive", industryDisplayName: "Oil and Gas / Extractive" },
  { industryIdentifier: "complex_manufacturing", industryDisplayName: "Complex Manufacturing" },
  {
    industryIdentifier: "multi_location_retail",
    industryDisplayName: "Multi-Location Retail",
  },
  { industryIdentifier: "saas_specialized", industryDisplayName: "SaaS (Specialized)" },
  {
    industryIdentifier: "professional_services_specialized",
    industryDisplayName: "Professional Services (Specialized)",
  },
  { industryIdentifier: "agriculture", industryDisplayName: "Agriculture" },
  { industryIdentifier: "hospitality", industryDisplayName: "Hospitality" },
  {
    industryIdentifier: "transportation_logistics",
    industryDisplayName: "Transportation and Logistics",
  },
  { industryIdentifier: "education", industryDisplayName: "Education" },
  { industryIdentifier: "government_municipal", industryDisplayName: "Government / Municipal" },
];

export const PHASE_42_INDUSTRY_REGISTRY_BLUEPRINT: ReadonlyArray<BuildIndustryRegistryEntryInput> = [
  {
    industryIdentifier: "generic",
    industryDisplayName: "Generic",
    industryStatus: "active",
    declaredSubClassifications: ["generic.default"],
    moduleSpecialistReviewDefault: false,
    perTopicDeclarations: [],
  },
  {
    industryIdentifier: "healthcare",
    industryDisplayName: "Healthcare",
    declaredSubClassifications: [
      "healthcare.acute_care_hospital",
      "healthcare.ambulatory_surgery_center",
      "healthcare.skilled_nursing_facility",
      "healthcare.physician_practice",
      "healthcare.home_health_or_hospice",
      "healthcare.other",
    ],
    moduleSpecialistReviewDefault: true,
    perTopicDeclarations: buildHealthcarePerTopicDeclarations(),
  },
  ...RECOGNIZED_UNPOPULATED_INDUSTRY_BLUEPRINT.map((industry) => ({
    industryIdentifier: industry.industryIdentifier,
    industryDisplayName: industry.industryDisplayName,
    industryStatus: "recognized_unpopulated" as IndustryStatus,
    declaredSubClassifications: [] as string[],
    moduleSpecialistReviewDefault: false,
    perTopicDeclarations: [] as IndustryPerTopicDeclaration[],
  })),
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getIndustryEntryInputs(input: BuildIndustryRegistryInput): BuildIndustryRegistryEntryInput[] {
  return input.industryEntries ?? [...PHASE_42_INDUSTRY_REGISTRY_BLUEPRINT];
}

function getContentReadinessMet(
  input: BuildIndustryRegistryInput,
  industryIdentifier: string,
  entryInput: BuildIndustryRegistryEntryInput,
): boolean {
  if (entryInput.contentReadinessMet !== undefined) {
    return entryInput.contentReadinessMet === true;
  }

  return input.contentReadinessByIndustry?.[industryIdentifier] === true;
}

function getSharedBase(input: Partial<IndustryBaseContract>): IndustryBaseContract {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    phase41_5StandardsHandoffHandle: input.phase41_5StandardsHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase41_5SnapshotHash: input.boundPhase41_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    phase42StaleMarker: input.phase42StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFramework: input.reportingFramework ?? "us_gaap",
    industryClassification: "registry",
    industrySubClassification: "",
    industryStatus: "active",
    containsPHI: getContainsPHI(input.containsPHI),
    phiDerivationStatus: input.phiDerivationStatus ?? "containsPHI",
    output_classification: "recommendation_for_human_review",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata),
    warnings: getInputArray(input.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes),
  } as IndustryBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildIndustryRegistryInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase41_5SnapshotHash)) {
    missing.push("boundPhase41_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  return missing;
}

function buildIndustryRegistryKey(industryRegistryEntries: SyntheticIndustryRegistryEntry[]): string {
  return stableSnapshotHash({
    registryEntryReferenceIds: industryRegistryEntries.map((entry) => entry.industryRegistryEntryId),
    industryIdentifiers: industryRegistryEntries.map((entry) => entry.industryIdentifier),
    industryStatuses: industryRegistryEntries.map((entry) => entry.industryStatus),
    selectableEqualsActiveOnly: true,
    neverSilentlySubstitutesIndustry: true,
  });
}

function buildIndustryRegistryId(industryRegistryEntries: SyntheticIndustryRegistryEntry[]): string {
  return `synthetic-industry-registry:${stableSnapshotHash({
    industryRegistryKey: buildIndustryRegistryKey(industryRegistryEntries),
    artifactType: "SyntheticIndustryRegistry",
  })}`;
}

function buildDerivationHash(industryRegistryEntries: SyntheticIndustryRegistryEntry[]): string {
  return stableSnapshotHash({
    activeIndustryIdentifiers: getActiveIndustryIdentifiers(industryRegistryEntries),
    nonActiveIndustryIdentifiers: getNonActiveIndustryIdentifiers(industryRegistryEntries),
    selectableIndustryIdentifiers: getSelectableIndustryIdentifiers(industryRegistryEntries),
    selectableEqualsActiveOnly: true,
    neverSilentlySubstitutesIndustry: true,
  });
}

function getActiveIndustryIdentifiers(industryRegistryEntries: SyntheticIndustryRegistryEntry[]): string[] {
  return industryRegistryEntries
    .filter((entry) => entry.industryStatus === "active")
    .map((entry) => entry.industryIdentifier);
}

function getNonActiveIndustryIdentifiers(industryRegistryEntries: SyntheticIndustryRegistryEntry[]): string[] {
  return industryRegistryEntries
    .filter((entry) => entry.industryStatus !== "active")
    .map((entry) => entry.industryIdentifier);
}

function getSelectableIndustryIdentifiers(industryRegistryEntries: SyntheticIndustryRegistryEntry[]): string[] {
  return industryRegistryEntries.filter((entry) => entry.isSelectable).map((entry) => entry.industryIdentifier);
}

function getWarnings(
  input: BuildIndustryRegistryInput,
  industryRegistryEntries: SyntheticIndustryRegistryEntry[],
  entryWarnings: string[],
): string[] {
  const activeIndustryIdentifiers = getActiveIndustryIdentifiers(industryRegistryEntries);
  const selectableIndustryIdentifiers = getSelectableIndustryIdentifiers(industryRegistryEntries);
  const selectableMismatch = selectableIndustryIdentifiers.some(
    (industryIdentifier) => !activeIndustryIdentifiers.includes(industryIdentifier),
  );

  return [
    ...getInputArray(input.warnings),
    ...entryWarnings,
    ...(selectableMismatch
      ? ["selectable industry identifiers must equal active industry identifiers with content readiness met only"]
      : []),
    ...(industryRegistryEntries.some(
      (entry) => entry.industryStatus === "recognized_unpopulated" && entry.isSelectable,
    )
      ? ["recognized_unpopulated industries must never be selectable; selection fails closed"]
      : []),
  ];
}

export function buildIndustryRegistry(input: BuildIndustryRegistryInput): BuildIndustryRegistryResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryRegistry: null,
      industryRegistryEntries: [],
      skippedIndexes: [],
      warnings: [`missing required industry registry identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const industryRegistryEntries: SyntheticIndustryRegistryEntry[] = [];
  const skippedIndexes: number[] = [];
  const entryWarnings: string[] = [];
  const industryEntryInputs = getIndustryEntryInputs(input);

  industryEntryInputs.forEach((entryInput, index) => {
    const industryIdentifier = entryInput.industryIdentifier ?? "";
    const result = buildIndustryRegistryEntry({
      ...input,
      ...entryInput,
      contentReadinessMet: getContentReadinessMet(input, industryIdentifier, entryInput),
      healthcareSpecialistAttestationComplete:
        entryInput.healthcareSpecialistAttestationComplete ?? input.healthcareSpecialistAttestationComplete,
      skippedIndexes: [...getInputArray(input.skippedIndexes), index],
    });

    if (result.industryRegistryEntry) {
      industryRegistryEntries.push(result.industryRegistryEntry);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    entryWarnings.push(...result.warnings.map((warning) => `industryRegistryEntry[${index}]: ${warning}`));
  });

  const base = getSharedBase(input);
  const industryRegistry: SyntheticIndustryRegistry = {
    ...base,
    industryRegistryId: buildIndustryRegistryId(industryRegistryEntries),
    industryRegistryKey: buildIndustryRegistryKey(industryRegistryEntries),
    registryEntryReferenceIds: industryRegistryEntries.map((entry) => entry.industryRegistryEntryId),
    activeIndustryIdentifiers: getActiveIndustryIdentifiers(industryRegistryEntries),
    nonActiveIndustryIdentifiers: getNonActiveIndustryIdentifiers(industryRegistryEntries),
    selectableIndustryIdentifiers: getSelectableIndustryIdentifiers(industryRegistryEntries),
    selectableEqualsActiveOnly: true,
    neverSilentlySubstitutesIndustry: true,
    executable: false,
    derivationHash: buildDerivationHash(industryRegistryEntries),
    warnings: getWarnings(input, industryRegistryEntries, entryWarnings),
    skippedIndexes,
    industryRegistryComplete: input.industryRegistryComplete === true && skippedIndexes.length === 0,
  };

  return {
    industryRegistry,
    industryRegistryEntries,
    skippedIndexes,
    warnings: industryRegistry.warnings,
  };
}
