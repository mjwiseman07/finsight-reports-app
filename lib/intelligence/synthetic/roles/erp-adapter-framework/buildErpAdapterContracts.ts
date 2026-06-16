import {
  buildErpAdapterContract,
  type BuildErpAdapterContractInput,
  type SyntheticErpAdapterContract,
} from "./buildErpAdapterContract";

export interface BuildErpAdapterContractsInput {
  items: BuildErpAdapterContractInput[];
}

export interface BuildErpAdapterContractsResult {
  erpAdapterContracts: SyntheticErpAdapterContract[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildErpAdapterContracts(input: BuildErpAdapterContractsInput): BuildErpAdapterContractsResult {
  const erpAdapterContracts: SyntheticErpAdapterContract[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildErpAdapterContract(item);

    if (result.erpAdapterContract) {
      erpAdapterContracts.push(result.erpAdapterContract);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `erpAdapterContracts[${index}]: ${warning}`));
  });

  return {
    erpAdapterContracts,
    skippedIndexes,
    warnings,
  };
}
