import { stableSnapshotHash } from "../../../core/hash";
import type {
  DifferenceDirection,
  StandardsBaseContract,
  StandardsMaterialityFlag,
  StandardsReportingFramework,
} from "../contracts";

type DifferenceCatalogEntryBase = Omit<StandardsBaseContract, "reportingFramework">;

export const DIFFERENCE_CATALOG_TOPIC_SCAFFOLD: Record<
  string,
  { gaapCitation: string; ifrsCitation: string; materialDifference: string }
> = {
  inventory_cost_methods: {
    gaapCitation: "ASC 330",
    ifrsCitation: "IAS 2",
    materialDifference: "GAAP allows LIFO; IFRS prohibits",
  },
  impairment_reversal: {
    gaapCitation: "ASC 360",
    ifrsCitation: "IAS 36",
    materialDifference: "GAAP prohibits reversal; IFRS permits except goodwill",
  },
  development_costs: {
    gaapCitation: "ASC 730",
    ifrsCitation: "IAS 38",
    materialDifference: "GAAP generally expenses; IFRS capitalizes if criteria met",
  },
  revenue_timing: {
    gaapCitation: "ASC 606",
    ifrsCitation: "IFRS 15",
    materialDifference: "ASC 606 vs IFRS 15 timing nuances",
  },
  lease_classification: {
    gaapCitation: "ASC 842",
    ifrsCitation: "IFRS 16",
    materialDifference: "GAAP operating/finance; IFRS 16 single lessee model",
  },
  property_revaluation: {
    gaapCitation: "ASC 360",
    ifrsCitation: "IAS 16",
    materialDifference: "GAAP prohibits revaluation; IFRS permits as policy choice",
  },
  intangible_amortization: {
    gaapCitation: "ASC 350",
    ifrsCitation: "IAS 38",
    materialDifference: "Indefinite-life treatment differences",
  },
  government_grants: {
    gaapCitation: "ASC 958",
    ifrsCitation: "IAS 20",
    materialDifference: "Recognition approach differences",
  },
};

export interface BuildDifferenceCatalogEntryInput extends Partial<DifferenceCatalogEntryBase> {
  topicIdentifier?: string;
  gaapTreatmentSummaryAuthored?: string;
  ifrsTreatmentSummaryAuthored?: string;
  differenceDirection?: DifferenceDirection;
  materialityFlag?: StandardsMaterialityFlag;
  conversionNotesAuthored?: string;
  gaapCitation?: string;
  ifrsCitation?: string;
  applicableJurisdictionalVariants?: StandardsReportingFramework[];
  linkedGaapTreatmentReferenceId?: string;
  linkedFullIfrsTreatmentReferenceId?: string;
  conversionEngineReferenceId?: string;
  isHumanReviewed?: boolean;
  reviewerIdentity?: string;
  reviewDate?: string;
  reviewAttestationReferenceId?: string;
  version?: string;
  effectiveFromDate?: string;
  priorVersionReferenceId?: string;
  differenceCatalogEntryComplete?: boolean;
}

export interface SyntheticDifferenceCatalogEntry extends DifferenceCatalogEntryBase {
  differenceCatalogEntryId: string;
  differenceCatalogEntryKey: string;
  topicIdentifier: string;
  gaapTreatmentSummaryAuthored: string;
  ifrsTreatmentSummaryAuthored: string;
  differenceDirection: DifferenceDirection;
  materialityFlag: StandardsMaterialityFlag;
  conversionNotesAuthored: string;
  gaapCitation: string;
  ifrsCitation: string;
  applicableJurisdictionalVariants: StandardsReportingFramework[];
  linkedGaapTreatmentReferenceId: string;
  linkedFullIfrsTreatmentReferenceId: string;
  consumedByConversionEngine: true;
  conversionEngineReferenceId: string;
  isHumanReviewed: boolean;
  reviewerIdentity: string;
  reviewDate: string;
  reviewAttestationReferenceId: string;
  activeRequiresReviewAttestation: true;
  containsCopyrightedText: false;
  citationIsReferenceOnlyNeverReproducedText: true;
  builderNeverAuthorsContent: true;
  version: string;
  effectiveFromDate: string;
  priorVersionReferenceId: string;
  appendOnlyHistory: true;
  differenceCatalogEntryComplete: boolean;
}

export interface BuildDifferenceCatalogEntryResult {
  differenceCatalogEntry: SyntheticDifferenceCatalogEntry | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function hasReviewAttestation(input: BuildDifferenceCatalogEntryInput): boolean {
  return (
    hasValue(input.reviewerIdentity) &&
    hasValue(input.reviewDate) &&
    hasValue(input.reviewAttestationReferenceId)
  );
}

function getIsHumanReviewed(input: BuildDifferenceCatalogEntryInput): boolean {
  if (input.isHumanReviewed !== true) {
    return false;
  }

  return hasReviewAttestation(input);
}

function getScaffoldTopic(topicIdentifier: string) {
  return DIFFERENCE_CATALOG_TOPIC_SCAFFOLD[topicIdentifier];
}

function getSharedBase(input: Partial<DifferenceCatalogEntryBase>): DifferenceCatalogEntryBase {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase41_5StaleMarker: input.phase41_5StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    containsPHI: getContainsPHI(input.containsPHI),
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
  } as DifferenceCatalogEntryBase;
}

function collectMissingRequiredIdentifiers(input: BuildDifferenceCatalogEntryInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
  }

  if (!input.differenceDirection) {
    missing.push("differenceDirection");
  }

  if (!hasValue(input.gaapCitation)) {
    missing.push("gaapCitation");
  }

  if (!hasValue(input.ifrsCitation)) {
    missing.push("ifrsCitation");
  }

  if (!hasValue(input.version)) {
    missing.push("version");
  }

  if (!hasValue(input.effectiveFromDate)) {
    missing.push("effectiveFromDate");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
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

  return missing;
}

function buildDifferenceCatalogEntryKey(input: BuildDifferenceCatalogEntryInput): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    differenceDirection: input.differenceDirection ?? "",
    materialityFlag: input.materialityFlag ?? "medium",
    gaapCitation: input.gaapCitation ?? "",
    ifrsCitation: input.ifrsCitation ?? "",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    linkedGaapTreatmentReferenceId: input.linkedGaapTreatmentReferenceId ?? "",
    linkedFullIfrsTreatmentReferenceId: input.linkedFullIfrsTreatmentReferenceId ?? "",
    conversionEngineReferenceId: input.conversionEngineReferenceId ?? "",
    isHumanReviewed: getIsHumanReviewed(input),
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
  });
}

function buildDifferenceCatalogEntryId(input: BuildDifferenceCatalogEntryInput): string {
  return `synthetic-difference-catalog-entry:${stableSnapshotHash({
    differenceCatalogEntryKey: buildDifferenceCatalogEntryKey(input),
    artifactType: "SyntheticDifferenceCatalogEntry",
  })}`;
}

function buildDerivationHash(input: BuildDifferenceCatalogEntryInput): string {
  return stableSnapshotHash({
    differenceCatalogEntryKey: buildDifferenceCatalogEntryKey(input),
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    consumedByConversionEngine: true,
    appendOnlyHistory: true,
    isHumanReviewed: getIsHumanReviewed(input),
  });
}

function getWarnings(
  input: BuildDifferenceCatalogEntryInput,
  isHumanReviewed: boolean,
): string[] {
  const topicIdentifier = input.topicIdentifier ?? "";
  const scaffoldTopic = getScaffoldTopic(topicIdentifier);

  return [
    ...getInputArray(input.warnings),
    ...(input.isHumanReviewed === true && !isHumanReviewed
      ? ["entry marked reviewed without reviewer identity, review date, or attestation; not marked reviewed"]
      : []),
    ...(!hasValue(input.gaapTreatmentSummaryAuthored) || !hasValue(input.ifrsTreatmentSummaryAuthored)
      ? ["GAAP and IFRS summaries are human-authored input; draft structure retained until content is supplied"]
      : []),
    ...(scaffoldTopic &&
    (input.gaapCitation !== scaffoldTopic.gaapCitation || input.ifrsCitation !== scaffoldTopic.ifrsCitation)
      ? [
          `citations differ from catalog scaffold for ${topicIdentifier}: expected GAAP ${scaffoldTopic.gaapCitation} and IFRS ${scaffoldTopic.ifrsCitation}`,
        ]
      : []),
    ...(!scaffoldTopic && hasValue(topicIdentifier)
      ? [`topicIdentifier ${topicIdentifier} is outside the differences catalog topic scaffold`]
      : []),
    ...(!hasValue(input.linkedGaapTreatmentReferenceId) || !hasValue(input.linkedFullIfrsTreatmentReferenceId)
      ? ["difference catalog entry should link to both 41.5L GAAP and 41.5N Full IFRS treatment references"]
      : []),
    ...(!hasValue(input.conversionEngineReferenceId)
      ? ["difference catalog is consumed by the 41.5P conversion engine via conversionEngineReferenceId"]
      : []),
    ...(!isHumanReviewed
      ? ["entry remains unreviewed until human review attestation is complete"]
      : []),
    "metadata-only differences catalog structure; builder never authors content and does not confirm difference accuracy — attestation confirms review marking only",
  ];
}

export function buildDifferenceCatalogEntry(
  input: BuildDifferenceCatalogEntryInput,
): BuildDifferenceCatalogEntryResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      differenceCatalogEntry: null,
      skipped: true,
      warnings: [
        `missing required difference catalog entry identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredTopicIdentifier = input.topicIdentifier as string;
  const requiredDifferenceDirection = input.differenceDirection as DifferenceDirection;
  const requiredGaapCitation = input.gaapCitation as string;
  const requiredIfrsCitation = input.ifrsCitation as string;
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const isHumanReviewed = getIsHumanReviewed(input);
  const base = getSharedBase(input);
  const differenceCatalogEntry: SyntheticDifferenceCatalogEntry = {
    ...base,
    differenceCatalogEntryId: buildDifferenceCatalogEntryId(input),
    differenceCatalogEntryKey: buildDifferenceCatalogEntryKey(input),
    topicIdentifier: requiredTopicIdentifier,
    gaapTreatmentSummaryAuthored: input.gaapTreatmentSummaryAuthored ?? "",
    ifrsTreatmentSummaryAuthored: input.ifrsTreatmentSummaryAuthored ?? "",
    differenceDirection: requiredDifferenceDirection,
    materialityFlag: input.materialityFlag ?? "medium",
    conversionNotesAuthored: input.conversionNotesAuthored ?? "",
    gaapCitation: requiredGaapCitation,
    ifrsCitation: requiredIfrsCitation,
    applicableJurisdictionalVariants: getInputArray(input.applicableJurisdictionalVariants),
    linkedGaapTreatmentReferenceId: input.linkedGaapTreatmentReferenceId ?? "",
    linkedFullIfrsTreatmentReferenceId: input.linkedFullIfrsTreatmentReferenceId ?? "",
    consumedByConversionEngine: true,
    conversionEngineReferenceId: input.conversionEngineReferenceId ?? "",
    isHumanReviewed,
    reviewerIdentity: input.reviewerIdentity ?? "",
    reviewDate: input.reviewDate ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    version: requiredVersion,
    effectiveFromDate: requiredEffectiveFromDate,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    appendOnlyHistory: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, isHumanReviewed),
    differenceCatalogEntryComplete:
      input.differenceCatalogEntryComplete === true && isHumanReviewed,
  };

  return {
    differenceCatalogEntry,
    skipped: false,
    warnings: differenceCatalogEntry.warnings,
  };
}
