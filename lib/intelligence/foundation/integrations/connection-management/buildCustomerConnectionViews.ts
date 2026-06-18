import {
  buildCustomerConnectionView,
  type BuildCustomerConnectionViewInput,
  type SyntheticCustomerConnectionView,
} from "./buildCustomerConnectionView";
import {
  buildWriteModeToggleRequest,
  type BuildWriteModeToggleRequestInput,
  type SyntheticWriteModeToggleRequest,
} from "./buildWriteModeToggleRequest";

export interface BuildCustomerConnectionViewsInput {
  customerConnectionViews: BuildCustomerConnectionViewInput[];
  writeModeToggleRequests?: BuildWriteModeToggleRequestInput[];
}

export interface BuildCustomerConnectionViewsResult {
  customerConnectionViews: SyntheticCustomerConnectionView[];
  writeModeToggleRequests: SyntheticWriteModeToggleRequest[];
  skippedIndexes: number[];
  skippedWriteModeToggleRequestIndexes: number[];
  warnings: string[];
}

export function buildCustomerConnectionViews(
  input: BuildCustomerConnectionViewsInput,
): BuildCustomerConnectionViewsResult {
  const customerConnectionViews: SyntheticCustomerConnectionView[] = [];
  const writeModeToggleRequests: SyntheticWriteModeToggleRequest[] = [];
  const skippedIndexes: number[] = [];
  const skippedWriteModeToggleRequestIndexes: number[] = [];
  const warnings: string[] = [];

  input.customerConnectionViews.forEach((viewInput, index) => {
    const result = buildCustomerConnectionView({
      ...viewInput,
      skippedIndexes: [...(viewInput.skippedIndexes ?? []), index],
    });

    if (result.customerConnectionView) {
      customerConnectionViews.push(result.customerConnectionView);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `customerConnectionView[${index}]: ${warning}`));
  });

  (input.writeModeToggleRequests ?? []).forEach((toggleInput, index) => {
    const result = buildWriteModeToggleRequest({
      ...toggleInput,
      skippedIndexes: [...(toggleInput.skippedIndexes ?? []), index],
    });

    if (result.writeModeToggleRequest) {
      writeModeToggleRequests.push(result.writeModeToggleRequest);
    }

    if (result.skipped) {
      skippedWriteModeToggleRequestIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `writeModeToggleRequest[${index}]: ${warning}`));
  });

  return {
    customerConnectionViews,
    writeModeToggleRequests,
    skippedIndexes,
    skippedWriteModeToggleRequestIndexes,
    warnings,
  };
}
