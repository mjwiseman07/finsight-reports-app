import {
  buildCommandCenterDecisionQueue,
  type BuildCommandCenterDecisionQueueInput,
  type BuildCommandCenterDecisionQueueResult,
  type SyntheticCommandCenterDecisionQueue,
} from "./buildCommandCenterDecisionQueue";

export interface BuildCommandCenterDecisionQueuesInput {
  requests: BuildCommandCenterDecisionQueueInput[];
}

export interface BuildCommandCenterDecisionQueuesResult {
  decisionQueues: SyntheticCommandCenterDecisionQueue[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommandCenterDecisionQueueResult[];
}

export function buildCommandCenterDecisionQueues(
  input: BuildCommandCenterDecisionQueuesInput,
): BuildCommandCenterDecisionQueuesResult {
  const decisionQueues: SyntheticCommandCenterDecisionQueue[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommandCenterDecisionQueueResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      decisionQueues,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommandCenterDecisionQueue(request);
    results.push(result);

    if (result.decisionQueue) {
      decisionQueues.push(result.decisionQueue);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    decisionQueues,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
