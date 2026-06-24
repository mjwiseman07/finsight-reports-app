import type { TenantClassification, TenantClassifier } from "./types";

export interface TenantClassifierDeps {
  readonly phiCoveredTenants: ReadonlySet<string>;
  readonly healthcareVerticalTenants: ReadonlySet<string>;
}

export class StaticTenantClassifier implements TenantClassifier {
  constructor(private readonly deps: TenantClassifierDeps) {}

  classify(tenantId: string): TenantClassification {
    if (this.deps.phiCoveredTenants.has(tenantId)) {
      return "phi-covered";
    }
    if (this.deps.healthcareVerticalTenants.has(tenantId)) {
      return "phi-covered";
    }
    return "standard";
  }
}
