/**
 * Phase G7-C5.5 — assertion pack shared types.
 */
import type {
  ExpectedFiling,
  ExtractedFiling,
  GapClassification,
  GapSeverity,
  ReportingFramework,
  SourceJson,
  ValidationTier,
  ExternalTruthVertical,
} from "../types";
import type { ToleranceBands } from "../lib/tolerances";

export interface ValidatorContext {
  filingPath: string;
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  extracted: ExtractedFiling;
  expected: ExpectedFiling;
  source: SourceJson | null;
  tolerances: ToleranceBands;
  materialityThreshold: number;
}

export interface AssertionResult {
  id: string;
  pack: string;
  tier: ValidationTier;
  passed: boolean;
  message: string;
  observed?: string;
  expected?: string;
  delta?: number;
  deltaPct?: number;
  tolerance?: number;
  withinTolerance?: boolean;
  materiality?: number;
  classification?: GapClassification;
  severity?: GapSeverity;
}
