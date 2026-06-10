import {
  buildAuditSurface,
  type BuildAuditSurfaceInput,
  type BuildAuditSurfaceResult,
  type SyntheticAuditSurface,
} from "./buildAuditSurface";

export interface BuildAuditSurfacesInput {
  requests: BuildAuditSurfaceInput[];
}

export interface BuildAuditSurfacesResult {
  auditSurfaces: SyntheticAuditSurface[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditSurfaceResult[];
}

export function buildAuditSurfaces(input: BuildAuditSurfacesInput): BuildAuditSurfacesResult {
  const auditSurfaces: SyntheticAuditSurface[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditSurfaceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditSurfaces,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditSurface(request);
    results.push(result);

    if (result.auditSurface) {
      auditSurfaces.push(result.auditSurface);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditSurfaces,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
