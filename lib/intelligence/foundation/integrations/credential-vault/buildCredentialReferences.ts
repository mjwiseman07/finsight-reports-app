import {
  buildCredentialReference,
  type BuildCredentialReferenceInput,
  type SyntheticCredentialReference,
} from "./buildCredentialReference";
import {
  buildVaultAccessContract,
  type BuildVaultAccessContractInput,
  type SyntheticVaultAccessContract,
} from "./buildVaultAccessContract";

export interface BuildCredentialReferencesInput {
  credentialReferences: BuildCredentialReferenceInput[];
  vaultAccessContracts?: BuildVaultAccessContractInput[];
}

export interface BuildCredentialReferencesResult {
  credentialReferences: SyntheticCredentialReference[];
  vaultAccessContracts: SyntheticVaultAccessContract[];
  skippedIndexes: number[];
  skippedVaultAccessContractIndexes: number[];
  warnings: string[];
}

export function buildCredentialReferences(input: BuildCredentialReferencesInput): BuildCredentialReferencesResult {
  const credentialReferences: SyntheticCredentialReference[] = [];
  const vaultAccessContracts: SyntheticVaultAccessContract[] = [];
  const skippedIndexes: number[] = [];
  const skippedVaultAccessContractIndexes: number[] = [];
  const warnings: string[] = [];

  input.credentialReferences.forEach((credentialInput, index) => {
    const result = buildCredentialReference({
      ...credentialInput,
      skippedIndexes: [...(credentialInput.skippedIndexes ?? []), index],
    });

    if (result.credentialReference) {
      credentialReferences.push(result.credentialReference);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `credentialReference[${index}]: ${warning}`));
  });

  (input.vaultAccessContracts ?? []).forEach((vaultInput, index) => {
    const result = buildVaultAccessContract({
      ...vaultInput,
      skippedIndexes: [...(vaultInput.skippedIndexes ?? []), index],
    });

    if (result.vaultAccessContract) {
      vaultAccessContracts.push(result.vaultAccessContract);
    }

    if (result.skipped) {
      skippedVaultAccessContractIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `vaultAccessContract[${index}]: ${warning}`));
  });

  return {
    credentialReferences,
    vaultAccessContracts,
    skippedIndexes,
    skippedVaultAccessContractIndexes,
    warnings,
  };
}
