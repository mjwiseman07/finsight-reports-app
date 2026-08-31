/** Production workflow migration registry. All workflows remain disabled. */
export const PRODUCTION_JE_WORKFLOWS = [
  "PRE_CLOSE_REVIEW",
  "ERP_API",
  "PULSE_CONFIRMATION",
  "LEARNING_SINGLE",
  "RECURRING_MANUAL",
  "LEARNING_BULK",
  "RECURRING_AUTO",
] as const;

export type ProductionJeWorkflow = (typeof PRODUCTION_JE_WORKFLOWS)[number];

export type ProductionJeWorkflowPolicy = Record<ProductionJeWorkflow, boolean>;

export const PRODUCTION_JE_WORKFLOW_POLICY: ProductionJeWorkflowPolicy = {
  PRE_CLOSE_REVIEW: false,
  ERP_API: false,
  PULSE_CONFIRMATION: false,
  LEARNING_SINGLE: false,
  RECURRING_MANUAL: false,
  LEARNING_BULK: false,
  RECURRING_AUTO: false,
};

export class ProductionJeWorkflowError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ProductionJeWorkflowError";
  }
}

export function assertProductionWorkflowGoverned(args: {
  workflow: ProductionJeWorkflow;
  executionId: string | null | undefined;
  policy?: ProductionJeWorkflowPolicy;
}): void {
  const policy = args.policy ?? PRODUCTION_JE_WORKFLOW_POLICY;
  if (!policy[args.workflow]) {
    throw new ProductionJeWorkflowError(
      "production_workflow_disabled",
      `Production workflow ${args.workflow} is disabled.`,
    );
  }
  if (!args.executionId) {
    throw new ProductionJeWorkflowError(
      "production_workflow_execution_required",
      "Governed executionId is required for production workflow authority.",
    );
  }
  if (args.workflow === "LEARNING_BULK" || args.workflow === "RECURRING_AUTO") {
    throw new ProductionJeWorkflowError(
      "production_workflow_auto_phase_required",
      "Production governed-auto workflows require a later separate phase.",
    );
  }
}

/**
 * Legacy/non-governed workflows may continue in non-production environments.
 * Production process env must pass the workflow registry before any poster call.
 */
export function assertProductionWorkflowGovernedWhenApplicable(args: {
  workflow: ProductionJeWorkflow;
  executionId: string | null | undefined;
  qboEnvironment?: string | null;
  policy?: ProductionJeWorkflowPolicy;
}): void {
  if ((args.qboEnvironment ?? process.env.QB_ENVIRONMENT) !== "production") {
    return;
  }
  assertProductionWorkflowGoverned({
    workflow: args.workflow,
    executionId: args.executionId,
    policy: args.policy,
  });
}
