import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticMarketplaceListingType = "ai_worker" | "department_template" | "organizational_template";

export type SyntheticMarketplaceListingStatus = "draft" | "published" | "unpublished";

export interface BuildMarketplaceListingInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  listingType?: SyntheticMarketplaceListingType;
  listingName?: string;
  listingDescription?: string;
  sourceReferenceId?: string;
  templateCompositionReferenceIds?: string[];
  industryAlignment?: string;
  listingStatus?: SyntheticMarketplaceListingStatus;
  containsPHI?: boolean;
  listingComplete?: boolean;
}

export interface SyntheticMarketplaceListing extends SyntheticPhase39RoleHandoffConsumptionContract {
  marketplaceListingId: string;
  marketplaceListingKey: string;
  listingType: SyntheticMarketplaceListingType;
  listingName: string;
  listingDescription: string;
  sourceReferenceId: string;
  templateCompositionReferenceIds: string[];
  industryAlignment: string;
  listingStatus: SyntheticMarketplaceListingStatus;
  humanCuratedBeforePublish: true;
  noAutonomousPublishing: true;
  listingComplete: boolean;
}

export interface BuildMarketplaceListingResult {
  marketplaceListing: SyntheticMarketplaceListing | null;
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

function getListingStatus(
  inputListingStatus: SyntheticMarketplaceListingStatus | undefined,
): SyntheticMarketplaceListingStatus {
  return inputListingStatus ?? "draft";
}

function getSharedBase(
  input: Partial<SyntheticOrganizationBaseContract>,
  parent: Partial<SyntheticOrganizationBaseContract>,
): SyntheticOrganizationBaseContract {
  return {
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? parent.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? parent.boundPhase38SnapshotHash ?? "",
    phase40StaleMarker: input.phase40StaleMarker ?? parent.phase40StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope ?? parent.scope,
    customerIsolation: input.customerIsolation ?? parent.customerIsolation,
    firmIsolation: input.firmIsolation ?? parent.firmIsolation,
    clientIsolation: input.clientIsolation ?? parent.clientIsolation,
    containsPHI: getContainsPHI(input.containsPHI ?? parent.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds ?? parent.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? parent.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata ?? parent.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(
      input.sourceConfidenceReferenceIds ?? parent.sourceConfidenceReferenceIds,
    ),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds ?? parent.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds ?? parent.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata ?? parent.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata ?? parent.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata ?? parent.governanceMetadata),
    warnings: getInputArray(input.warnings ?? parent.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes ?? parent.skippedIndexes),
  } as SyntheticOrganizationBaseContract;
}

function getPhase39HandoffBase(
  input: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
  parent: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
): SyntheticPhase39RoleHandoffConsumptionContract {
  return {
    ...getSharedBase(input, parent),
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? parent.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(
      input.phase39RoleInstanceReferenceIds ?? parent.phase39RoleInstanceReferenceIds,
    ),
  };
}

function collectMissingRequiredIdentifiers(input: BuildMarketplaceListingInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.listingType)) {
    missing.push("listingType");
  }

  if (!hasValue(input.phase39RoleHandoffHandle)) {
    missing.push("phase39RoleHandoffHandle");
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

function buildMarketplaceListingDerivationHash(input: BuildMarketplaceListingInput): string {
  return stableSnapshotHash({
    listingType: input.listingType ?? "",
    listingName: input.listingName ?? "",
    listingDescription: input.listingDescription ?? "",
    sourceReferenceId: input.sourceReferenceId ?? "",
    templateCompositionReferenceIds: getInputArray(input.templateCompositionReferenceIds),
    industryAlignment: input.industryAlignment ?? "",
    listingStatus: getListingStatus(input.listingStatus),
    humanCuratedBeforePublish: true,
    noAutonomousPublishing: true,
    containsPHI: getContainsPHI(input.containsPHI),
    listingComplete: input.listingComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildMarketplaceListing(input: BuildMarketplaceListingInput): BuildMarketplaceListingResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      marketplaceListing: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const listingType = input.listingType as SyntheticMarketplaceListingType;
  const containsPHI = getContainsPHI(input.containsPHI);
  const listingStatus = getListingStatus(input.listingStatus);
  const derivationHash = buildMarketplaceListingDerivationHash(input);
  const marketplaceListingKey = stableSnapshotHash({
    listingType,
    listingName: input.listingName ?? "",
    sourceReferenceId: input.sourceReferenceId ?? "",
    templateCompositionReferenceIds: getInputArray(input.templateCompositionReferenceIds),
    listingStatus,
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );

  return {
    marketplaceListing: {
      ...base,
      marketplaceListingId: stableSnapshotHash({
        marketplaceListingKey,
        artifactType: "SyntheticMarketplaceListing",
      }),
      marketplaceListingKey,
      listingType,
      listingName: input.listingName ?? "",
      listingDescription: input.listingDescription ?? "",
      sourceReferenceId: input.sourceReferenceId ?? "",
      templateCompositionReferenceIds: getInputArray(input.templateCompositionReferenceIds),
      industryAlignment: input.industryAlignment ?? "",
      listingStatus,
      humanCuratedBeforePublish: true,
      noAutonomousPublishing: true,
      listingComplete: input.listingComplete === true,
      containsPHI,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
