import { FrameworkViolationError } from "../errors/FrameworkViolationError";

export class CrossoverViolationError extends Error {
  constructor(
    public readonly validator: string,
    public readonly detail: string,
  ) {
    super(`${validator}: ${detail}`);
    this.name = "CrossoverViolationError";
  }
}

export class EntityFrameworkComminglingError extends FrameworkViolationError {
  constructor(entityId: string, frameworks: string[]) {
    super(
      "CROSSOVER",
      `entity ${entityId} declares multiple frameworks: ${frameworks.join(", ")}`,
      "framework-consistency",
      "Each entity must route through a single framework lane.",
    );
    this.name = "EntityFrameworkComminglingError";
  }
}

export class EmitterPathMismatchError extends CrossoverViolationError {
  constructor(gapId: string, detail: string) {
    super("emitter-path-integrity", `${gapId}: ${detail}`);
    this.name = "EmitterPathMismatchError";
  }
}

export class CrossoverFootingError extends CrossoverViolationError {
  constructor(detail: string) {
    super("crossover-footing", detail);
    this.name = "CrossoverFootingError";
  }
}

export class LessorGapDetectedError extends CrossoverViolationError {
  constructor(gapIds: string[]) {
    super("lessor-gap-surveillance", `lessor-scoped lease gaps detected: ${gapIds.join(", ")}`);
    this.name = "LessorGapDetectedError";
  }
}

export class RegisterClassificationMismatchError extends CrossoverViolationError {
  constructor(detail: string) {
    super("register-classification", detail);
    this.name = "RegisterClassificationMismatchError";
  }
}

export class CollapseStepUndocumentedError extends CrossoverViolationError {
  constructor(gapId: string) {
    super(
      "collapse-step-documentation",
      `${gapId}: reclassified_in equals closed_in but collapse-step not documented`,
    );
    this.name = "CollapseStepUndocumentedError";
  }
}
